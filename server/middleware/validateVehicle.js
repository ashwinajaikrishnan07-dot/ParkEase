const mongoose = require('mongoose');
const { VEHICLE_TYPES } = require('../models/Vehicle');

function normalizeRegistration(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]/g, '') : '';
}

function normalizeLabel(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function validateVehicle(request, response, next) {
  const source = request.body || {};
  const registrationNumber = normalizeRegistration(source.registrationNumber);
  const type = typeof source.type === 'string' ? source.type.trim().toUpperCase() : '';
  const model = normalizeLabel(source.model);
  const color = normalizeLabel(source.color);
  const errors = {};

  if (!/^[A-Z0-9]{5,15}$/.test(registrationNumber)) {
    errors.registrationNumber = 'Registration number must contain 5 to 15 letters or digits';
  }
  if (!VEHICLE_TYPES.includes(type)) {
    errors.type = `Vehicle type must be one of: ${VEHICLE_TYPES.join(', ')}`;
  }
  if (!model || model.length > 60) {
    errors.model = 'Vehicle model is required and cannot exceed 60 characters';
  }
  if (!color || color.length > 30) {
    errors.color = 'Vehicle color is required and cannot exceed 30 characters';
  }
  if (Object.hasOwn(source, 'owner')) {
    errors.owner = 'Vehicle owner is assigned from the authenticated account';
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  request.body = { registrationNumber, type, model, color };
  return next();
}

function validateVehicleId(request, response, next) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) {
    return response.status(400).json({
      success: false,
      message: 'Invalid vehicle id',
    });
  }

  return next();
}

module.exports = { normalizeRegistration, validateVehicle, validateVehicleId };
