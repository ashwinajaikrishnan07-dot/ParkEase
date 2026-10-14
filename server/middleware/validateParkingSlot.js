const mongoose = require('mongoose');
const { SLOT_CATEGORIES, SLOT_STATUSES } = require('../models/ParkingSlot');
const { VEHICLE_TYPES } = require('../models/Vehicle');

function validateParkingSlot(request, response, next) {
  const source = request.body || {};
  const area = typeof source.area === 'string' ? source.area.trim() : '';
  const slotNumber = typeof source.slotNumber === 'string'
    ? source.slotNumber.trim().toUpperCase().replace(/[\s-]/g, '')
    : '';
  const vehicleType = typeof source.vehicleType === 'string' ? source.vehicleType.trim().toUpperCase() : '';
  const category = typeof source.category === 'string' ? source.category.trim().toUpperCase() : '';
  const status = typeof source.status === 'string' ? source.status.trim().toUpperCase() : '';
  const errors = {};

  if (!mongoose.isObjectIdOrHexString(area)) errors.area = 'Select a valid parking area';
  if (!/^[A-Z0-9]{1,12}$/.test(slotNumber)) errors.slotNumber = 'Slot number must contain 1 to 12 letters or digits';
  if (!VEHICLE_TYPES.includes(vehicleType)) errors.vehicleType = `Vehicle type must be one of: ${VEHICLE_TYPES.join(', ')}`;
  if (!SLOT_CATEGORIES.includes(category)) errors.category = `Category must be one of: ${SLOT_CATEGORIES.join(', ')}`;
  if (!SLOT_STATUSES.includes(status)) errors.status = `Status must be one of: ${SLOT_STATUSES.join(', ')}`;

  for (const field of ['_id', 'createdAt', 'updatedAt']) {
    if (Object.hasOwn(source, field)) errors[field] = `${field} cannot be changed here`;
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  request.body = { area, slotNumber, vehicleType, category, status };
  return next();
}

function validateParkingSlotId(request, response, next) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) {
    return response.status(400).json({ success: false, message: 'Invalid parking slot id' });
  }
  return next();
}

function validateSlotFilters(request, response, next) {
  const errors = {};
  if (request.query.area && !mongoose.isObjectIdOrHexString(request.query.area)) errors.area = 'Invalid parking area filter';
  if (request.query.vehicleType && !VEHICLE_TYPES.includes(request.query.vehicleType.toUpperCase())) errors.vehicleType = 'Invalid vehicle type filter';
  if (request.query.category && !SLOT_CATEGORIES.includes(request.query.category.toUpperCase())) errors.category = 'Invalid category filter';
  if (request.query.status && !SLOT_STATUSES.includes(request.query.status.toUpperCase())) errors.status = 'Invalid status filter';

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Invalid filters', errors });
  }
  return next();
}

module.exports = { validateParkingSlot, validateParkingSlotId, validateSlotFilters };
