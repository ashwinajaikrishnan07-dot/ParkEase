const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');
const AppError = require('../utils/AppError');
const { enrichWithAvailability } = require('../utils/areaAvailability');

async function listParkingAreas(request, response) {
  const filter = {};
  if (request.query.status) filter.status = request.query.status.toUpperCase();
  const areas = await ParkingArea.find(filter).sort({ name: 1, location: 1 });
  const parkingAreas = await enrichWithAvailability(areas);
  response.status(200).json({ success: true, message: 'Parking areas retrieved', data: { parkingAreas } });
}

async function createParkingArea(request, response) {
  const parkingArea = await ParkingArea.create(request.body);
  response.status(201).json({ success: true, message: 'Parking area created', data: { parkingArea } });
}

async function getParkingArea(request, response) {
  const area = await ParkingArea.findById(request.params.id);
  if (!area) throw new AppError('Parking area not found', 404);
  const [parkingArea] = await enrichWithAvailability([area]);
  response.status(200).json({ success: true, message: 'Parking area retrieved', data: { parkingArea } });
}

async function updateParkingArea(request, response) {
  const parkingArea = await ParkingArea.findById(request.params.id);
  if (!parkingArea) throw new AppError('Parking area not found', 404);

  const slotCount = await ParkingSlot.countDocuments({ area: parkingArea._id });
  if (request.body.capacity < slotCount) {
    throw new AppError('Capacity cannot be lower than the current slot count', 409, {
      capacity: `This area currently contains ${slotCount} slots`,
    });
  }

  const incompatibleTypes = await ParkingSlot.distinct('vehicleType', {
    area: parkingArea._id,
    vehicleType: { $nin: request.body.allowedVehicleTypes },
  });
  if (incompatibleTypes.length > 0) {
    throw new AppError('Allowed vehicle types conflict with existing slots', 409, {
      allowedVehicleTypes: `Existing slots require: ${incompatibleTypes.join(', ')}`,
    });
  }

  Object.assign(parkingArea, request.body);
  await parkingArea.save();
  response.status(200).json({ success: true, message: 'Parking area updated', data: { parkingArea } });
}

async function deleteParkingArea(request, response) {
  const parkingArea = await ParkingArea.findById(request.params.id);
  if (!parkingArea) throw new AppError('Parking area not found', 404);

  const slotCount = await ParkingSlot.countDocuments({ area: parkingArea._id });
  if (slotCount > 0) {
    throw new AppError('Parking areas containing slots cannot be deleted', 409, {
      parkingArea: `Delete the ${slotCount} existing slots first`,
    });
  }

  await parkingArea.deleteOne();
  response.status(200).json({ success: true, message: 'Parking area deleted', data: { id: parkingArea._id.toString() } });
}

async function getAlternatives(request, response) {
  const area = await ParkingArea.findById(request.params.id);
  if (!area) throw new AppError('Parking area not found', 404);

  // Prefer siblings at the same destination, then any other open areas.
  const siblingFilter = { _id: { $ne: area._id }, status: 'OPEN' };
  if (area.destination) siblingFilter.destination = area.destination;
  let candidates = await ParkingArea.find(siblingFilter).sort({ walkingMinutes: 1 });

  if (candidates.length === 0 && area.destination) {
    candidates = await ParkingArea.find({ _id: { $ne: area._id }, status: 'OPEN' }).sort({ walkingMinutes: 1 }).limit(10);
  }

  const enriched = await enrichWithAvailability(candidates);
  const alternatives = enriched
    .filter((candidate) => candidate.availability.availableSlots > 0)
    // Overflow areas are surfaced first (they exist to absorb spillover), then by availability.
    .sort((a, b) => (Number(b.isOverflow) - Number(a.isOverflow)) || (b.availability.availableSlots - a.availability.availableSlots))
    .slice(0, 5);

  response.status(200).json({
    success: true,
    message: 'Alternative parking retrieved',
    data: { alternatives },
  });
}

module.exports = {
  createParkingArea,
  deleteParkingArea,
  getAlternatives,
  getParkingArea,
  listParkingAreas,
  updateParkingArea,
};
