const OccupancyHistory = require('../models/OccupancyHistory');
const ParkingArea = require('../models/ParkingArea');
const ParkingReport = require('../models/ParkingReport');
const ParkingSlot = require('../models/ParkingSlot');
const Reservation = require('../models/Reservation');

async function getDashboard(_request, response) {
  const [slotCounts, activeReservations, pendingReports] = await Promise.all([
    ParkingSlot.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Reservation.countDocuments({ status: { $in: ['ACTIVE', 'CHECKED_IN'] } }),
    ParkingReport.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } }),
  ]);

  const byStatus = Object.fromEntries(slotCounts.map((item) => [item._id, item.count]));
  const totalSlots = slotCounts.reduce((sum, item) => sum + item.count, 0);
  const occupiedSlots = byStatus.OCCUPIED || 0;
  const maintenanceSlots = byStatus.MAINTENANCE || 0;
  const usableSlots = totalSlots - maintenanceSlots;
  const occupancyPercentage = usableSlots > 0 ? Math.round((occupiedSlots / usableSlots) * 10000) / 100 : 0;

  response.status(200).json({
    success: true,
    message: 'Dashboard analytics retrieved',
    data: {
      totalSlots,
      availableSlots: byStatus.AVAILABLE || 0,
      occupiedSlots,
      reservedSlots: byStatus.RESERVED || 0,
      maintenanceSlots,
      activeReservations,
      pendingReports,
      occupancyPercentage,
    },
  });
}

async function getOccupancy(request, response) {
  const sinceHours = Math.min(Math.max(Number(request.query.hours) || 24, 1), 720);
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const summaries = await OccupancyHistory.aggregate([
    { $match: { recordedAt: { $gte: since } } },
    {
      $group: {
        _id: '$area',
        samples: { $sum: 1 },
        averageOccupancy: { $avg: '$occupancyPercentage' },
        peakOccupancy: { $max: '$occupancyPercentage' },
        lastRecordedAt: { $max: '$recordedAt' },
      },
    },
  ]);

  const areas = await ParkingArea.find().select('name location').lean();
  const areaById = new Map(areas.map((area) => [area._id.toString(), area]));
  const occupancy = summaries.map((item) => ({
    area: item._id,
    areaName: areaById.get(item._id.toString())?.name || 'Unknown area',
    samples: item.samples,
    averageOccupancy: Math.round(item.averageOccupancy * 100) / 100,
    peakOccupancy: item.peakOccupancy,
    lastRecordedAt: item.lastRecordedAt,
  })).sort((a, b) => b.averageOccupancy - a.averageOccupancy);

  response.status(200).json({
    success: true,
    message: 'Occupancy analytics retrieved',
    data: { windowHours: sinceHours, occupancy },
  });
}

const SERVER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

async function getPeakHours(_request, response) {
  const buckets = await Reservation.aggregate([
    { $group: { _id: { $hour: { date: '$startTime', timezone: SERVER_TIMEZONE } }, reservations: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const byHour = Object.fromEntries(buckets.map((item) => [item._id, item.reservations]));
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({ hour, reservations: byHour[hour] || 0 }));
  const busiest = peakHours.reduce((max, item) => (item.reservations > max.reservations ? item : max), peakHours[0]);

  response.status(200).json({
    success: true,
    message: 'Peak-hour analytics retrieved',
    data: { peakHours, busiestHour: busiest.reservations > 0 ? busiest.hour : null },
  });
}

module.exports = { getDashboard, getOccupancy, getPeakHours };
