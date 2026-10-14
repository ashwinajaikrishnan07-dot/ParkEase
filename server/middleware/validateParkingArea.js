const mongoose = require('mongoose');
const { AREA_STATUSES } = require('../models/ParkingArea');
const { VEHICLE_TYPES } = require('../models/Vehicle');

function normalizeLabel(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function validateParkingArea(request, response, next) {
  const source = request.body || {};
  const name = normalizeLabel(source.name);
  const location = normalizeLabel(source.location);
  const description = normalizeLabel(source.description);
  const capacity = Number(source.capacity);
  const status = typeof source.status === 'string' ? source.status.trim().toUpperCase() : '';
  const allowedVehicleTypes = Array.isArray(source.allowedVehicleTypes)
    ? [...new Set(source.allowedVehicleTypes.map((type) => String(type).trim().toUpperCase()))]
    : [];
  const errors = {};

  if (name.length < 2 || name.length > 80) errors.name = 'Name must contain between 2 and 80 characters';
  if (location.length < 2 || location.length > 160) errors.location = 'Location must contain between 2 and 160 characters';
  if (description.length > 500) errors.description = 'Description cannot exceed 500 characters';
  if (source.capacity === '' || !Number.isInteger(capacity) || capacity < 1 || capacity > 10000) {
    errors.capacity = 'Capacity must be a whole number between 1 and 10000';
  }
  if (!AREA_STATUSES.includes(status)) errors.status = `Status must be one of: ${AREA_STATUSES.join(', ')}`;
  if (allowedVehicleTypes.length === 0 || allowedVehicleTypes.some((type) => !VEHICLE_TYPES.includes(type))) {
    errors.allowedVehicleTypes = `Select one or more valid types: ${VEHICLE_TYPES.join(', ')}`;
  }

  for (const field of ['_id', 'createdAt', 'updatedAt']) {
    if (Object.hasOwn(source, field)) errors[field] = `${field} cannot be changed here`;
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  request.body = { name, location, description, capacity, allowedVehicleTypes, status };
  return next();
}

function validateParkingAreaId(request, response, next) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) {
    return response.status(400).json({ success: false, message: 'Invalid parking area id' });
  }
  return next();
}

module.exports = { validateParkingArea, validateParkingAreaId };
