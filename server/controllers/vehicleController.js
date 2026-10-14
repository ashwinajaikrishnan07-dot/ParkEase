const Reservation = require('../models/Reservation');
const Vehicle = require('../models/Vehicle');
const AppError = require('../utils/AppError');

async function findAuthorizedVehicle(request) {
  const vehicle = await Vehicle.findById(request.params.id);
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  if (!vehicle.owner.equals(request.user._id) && request.user.role !== 'admin') {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  return vehicle;
}

async function listVehicles(request, response) {
  const vehicles = await Vehicle.find({ owner: request.user._id }).sort({ createdAt: -1 });
  response.status(200).json({ success: true, message: 'Vehicles retrieved', data: { vehicles } });
}

async function createVehicle(request, response) {
  const duplicate = await Vehicle.exists({ registrationNumber: request.body.registrationNumber });
  if (duplicate) throw new AppError('A vehicle with this registration number already exists', 409, { registrationNumber: 'This registration number is already registered' });
  const vehicle = await Vehicle.create({ ...request.body, owner: request.user._id });
  response.status(201).json({ success: true, message: 'Vehicle created', data: { vehicle } });
}

async function getVehicle(request, response) {
  const vehicle = await findAuthorizedVehicle(request);
  response.status(200).json({ success: true, message: 'Vehicle retrieved', data: { vehicle } });
}

async function updateVehicle(request, response) {
  const vehicle = await findAuthorizedVehicle(request);
  const duplicate = await Vehicle.exists({ registrationNumber: request.body.registrationNumber, _id: { $ne: vehicle._id } });
  if (duplicate) throw new AppError('A vehicle with this registration number already exists', 409, { registrationNumber: 'This registration number is already registered' });
  Object.assign(vehicle, request.body);
  await vehicle.save();
  response.status(200).json({ success: true, message: 'Vehicle updated', data: { vehicle } });
}

async function deleteVehicle(request, response) {
  const vehicle = await findAuthorizedVehicle(request);
  if (await Reservation.exists({ vehicle: vehicle._id, status: { $in: ['ACTIVE', 'CHECKED_IN'] } })) {
    throw new AppError('Vehicles with an active reservation cannot be deleted', 409);
  }
  await vehicle.deleteOne();
  response.status(200).json({ success: true, message: 'Vehicle deleted', data: { id: vehicle._id.toString() } });
}

module.exports = { createVehicle, deleteVehicle, getVehicle, listVehicles, updateVehicle };
