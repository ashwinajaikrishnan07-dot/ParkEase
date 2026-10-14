const mongoose = require('mongoose');
const Destination = require('../models/Destination');
const { DESTINATION_CATEGORIES } = require('../models/Destination');
const ParkingArea = require('../models/ParkingArea');
const AppError = require('../utils/AppError');
const { enrichWithAvailability } = require('../utils/areaAvailability');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listDestinations(request, response) {
  const filter = {};
  const q = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  const category = typeof request.query.category === 'string' ? request.query.category.trim().toUpperCase() : '';

  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { address: pattern }, { city: pattern }];
  }
  if (category && DESTINATION_CATEGORIES.includes(category)) filter.category = category;

  const destinations = await Destination.find(filter).sort({ rating: -1, name: 1 }).limit(50).lean();
  const areaCounts = await ParkingArea.aggregate([
    { $match: { destination: { $ne: null } } },
    { $group: { _id: '$destination', count: { $sum: 1 } } },
  ]);
  const countByDestination = new Map(areaCounts.map((row) => [row._id.toString(), row.count]));

  const withCounts = destinations.map((destination) => ({
    ...destination,
    parkingAreaCount: countByDestination.get(destination._id.toString()) || 0,
  }));

  response.status(200).json({ success: true, message: 'Destinations retrieved', data: { destinations: withCounts } });
}

async function getDestination(request, response) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) throw new AppError('Invalid destination id', 400);
  const destination = await Destination.findById(request.params.id).lean();
  if (!destination) throw new AppError('Destination not found', 404);
  response.status(200).json({ success: true, message: 'Destination retrieved', data: { destination } });
}

async function getDestinationParking(request, response) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) throw new AppError('Invalid destination id', 400);
  const destination = await Destination.findById(request.params.id).lean();
  if (!destination) throw new AppError('Destination not found', 404);

  const filter = { destination: destination._id };
  const vehicleType = typeof request.query.vehicleType === 'string' ? request.query.vehicleType.trim().toUpperCase() : '';
  if (vehicleType) filter.allowedVehicleTypes = vehicleType;

  const areas = await ParkingArea.find(filter).sort({ walkingMinutes: 1, name: 1 });
  let parkingAreas = await enrichWithAvailability(areas);

  // Recommendation score: availability, walking distance, price, and congestion.
  parkingAreas = parkingAreas
    .map((area) => {
      const avail = vehicleType ? area.availability.availableByType[vehicleType] || 0 : area.availability.availableSlots;
      const availabilityScore = Math.min(avail / 10, 5) * 10;
      const walkScore = Math.max(0, 10 - (area.walkingMinutes || 0)) * 2;
      const priceScore = Math.max(0, 10 - (area.pricePerHour || 0) / 10);
      const congestionPenalty = (area.availability.occupancyPercentage || 0) / 10;
      const score = Math.round((availabilityScore + walkScore + priceScore - congestionPenalty) * 100) / 100;
      return { ...area, recommendationScore: score, matchedAvailable: avail };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);

  response.status(200).json({
    success: true,
    message: 'Destination parking retrieved',
    data: { destination, parkingAreas },
  });
}

const { congestionLevel } = require('../utils/areaAvailability');
const TrafficReport = require('../models/TrafficReport');
const { summarize } = require('./trafficController');

// Live, non-predictive insight: current occupancy from real slot state plus the
// latest crowd-sourced traffic reports from other drivers (no AI estimation).
async function getDestinationInsights(request, response) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) throw new AppError('Invalid destination id', 400);
  const destination = await Destination.findById(request.params.id).lean();
  if (!destination) throw new AppError('Destination not found', 404);

  const areas = await ParkingArea.find({ destination: destination._id });
  const enriched = await enrichWithAvailability(areas);

  const totalSlots = enriched.reduce((sum, a) => sum + a.availability.totalSlots, 0);
  const availableSlots = enriched.reduce((sum, a) => sum + a.availability.availableSlots, 0);
  const occupiedSlots = enriched.reduce((sum, a) => sum + a.availability.occupiedSlots, 0);
  const usableSlots = enriched.reduce((sum, a) => sum + a.availability.usableSlots, 0);
  const occupancyPercentage = usableSlots > 0 ? Math.round((occupiedSlots / usableSlots) * 10000) / 100 : 0;
  const overall = congestionLevel({ usableSlots, availableSlots, occupancyPercentage });

  const trafficReports = await TrafficReport.find({ destination: destination._id }).sort({ createdAt: -1 }).limit(20).lean();
  const traffic = summarize(trafficReports);

  let warning = null;
  if (overall === 'FULL') warning = 'All parking here is currently full. Consider nearby alternatives.';
  else if (overall === 'HIGH') warning = `Parking is ${occupancyPercentage}% occupied and filling fast.`;
  else if (traffic.level === 'HEAVY') warning = 'Drivers are reporting heavy traffic around this area right now.';

  response.status(200).json({
    success: true,
    message: 'Destination insights retrieved',
    data: {
      insights: {
        totalSlots,
        availableSlots,
        occupancyPercentage,
        congestionLevel: overall,
        traffic,
        warning,
      },
    },
  });
}

module.exports = { getDestination, getDestinationInsights, getDestinationParking, listDestinations };
