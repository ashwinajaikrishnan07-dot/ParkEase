const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');
const Reservation = require('../models/Reservation');
const AppError = require('../utils/AppError');

async function requireCompatibleArea(areaId, vehicleType) {
  const area = await ParkingArea.findById(areaId);
  if (!area) throw new AppError('Parking area not found', 404);
  if (!area.allowedVehicleTypes.includes(vehicleType)) throw new AppError('Vehicle type is not allowed in this parking area', 409, { vehicleType: `Allowed types: ${area.allowedVehicleTypes.join(', ')}` });
  return area;
}
async function ensureUniqueSlot(area, slotNumber, excludedId) {
  const query = { area, slotNumber };
  if (excludedId) query._id = { $ne: excludedId };
  if (await ParkingSlot.exists(query)) throw new AppError('This slot number already exists in the selected parking area', 409, { slotNumber: 'Choose a different slot number' });
}
async function listParkingSlots(request, response) {
  const filter = {};
  for (const field of ['area', 'vehicleType', 'category', 'status']) if (request.query[field]) filter[field] = field === 'area' ? request.query[field] : request.query[field].toUpperCase();
  const parkingSlots = await ParkingSlot.find(filter).sort({ area: 1, slotNumber: 1 });
  response.status(200).json({ success: true, message: 'Parking slots retrieved', data: { parkingSlots } });
}
async function createParkingSlot(request, response) {
  const area = await requireCompatibleArea(request.body.area, request.body.vehicleType);
  const slotCount = await ParkingSlot.countDocuments({ area: area._id });
  if (slotCount >= area.capacity) throw new AppError('Parking area is at capacity', 409, { area: `Maximum capacity is ${area.capacity}` });
  await ensureUniqueSlot(area._id, request.body.slotNumber);
  const parkingSlot = await ParkingSlot.create(request.body);
  response.status(201).json({ success: true, message: 'Parking slot created', data: { parkingSlot } });
}
async function getParkingSlot(request, response) {
  const parkingSlot = await ParkingSlot.findById(request.params.id);
  if (!parkingSlot) throw new AppError('Parking slot not found', 404);
  response.status(200).json({ success: true, message: 'Parking slot retrieved', data: { parkingSlot } });
}
async function updateParkingSlot(request, response) {
  const parkingSlot = await ParkingSlot.findById(request.params.id);
  if (!parkingSlot) throw new AppError('Parking slot not found', 404);
  if (await Reservation.exists({ slot: parkingSlot._id, status: { $in: ['ACTIVE', 'CHECKED_IN'] } })) throw new AppError('Slots with an active reservation cannot be modified', 409);
  const area = await requireCompatibleArea(request.body.area, request.body.vehicleType);
  if (!parkingSlot.area.equals(area._id) && await ParkingSlot.countDocuments({ area: area._id }) >= area.capacity) throw new AppError('Parking area is at capacity', 409, { area: `Maximum capacity is ${area.capacity}` });
  await ensureUniqueSlot(area._id, request.body.slotNumber, parkingSlot._id);
  Object.assign(parkingSlot, request.body);
  await parkingSlot.save();
  response.status(200).json({ success: true, message: 'Parking slot updated', data: { parkingSlot } });
}
async function deleteParkingSlot(request, response) {
  const parkingSlot = await ParkingSlot.findById(request.params.id);
  if (!parkingSlot) throw new AppError('Parking slot not found', 404);
  if (['OCCUPIED', 'RESERVED'].includes(parkingSlot.status) || await Reservation.exists({ slot: parkingSlot._id, status: { $in: ['ACTIVE', 'CHECKED_IN'] } })) throw new AppError('Occupied or reserved slots cannot be deleted', 409, { status: `Slot is currently ${parkingSlot.status.toLowerCase()}` });
  await parkingSlot.deleteOne();
  response.status(200).json({ success: true, message: 'Parking slot deleted', data: { id: parkingSlot._id.toString() } });
}

module.exports = { createParkingSlot, deleteParkingSlot, getParkingSlot, listParkingSlots, updateParkingSlot };
