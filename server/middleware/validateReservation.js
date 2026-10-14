const mongoose = require('mongoose');

function validateReservationCreate(request, response, next) {
  const source = request.body || {};
  const vehicle = typeof source.vehicle === 'string' ? source.vehicle.trim() : '';
  const area = typeof source.area === 'string' ? source.area.trim() : '';
  const slot = typeof source.slot === 'string' ? source.slot.trim() : '';
  const startTime = new Date(source.startTime);
  const endTime = new Date(source.endTime);
  const now = Date.now();
  const errors = {};

  if (!mongoose.isObjectIdOrHexString(vehicle)) errors.vehicle = 'Select a valid vehicle';
  if (!mongoose.isObjectIdOrHexString(area)) errors.area = 'Select a valid parking area';
  if (!mongoose.isObjectIdOrHexString(slot)) errors.slot = 'Select a valid parking slot';
  if (Number.isNaN(startTime.getTime())) errors.startTime = 'Enter a valid start time';
  else if (startTime.getTime() < now - 60000) errors.startTime = 'Start time cannot be in the past';
  else if (startTime.getTime() > now + 30 * 24 * 60 * 60 * 1000) errors.startTime = 'Start time cannot be more than 30 days ahead';
  if (Number.isNaN(endTime.getTime())) errors.endTime = 'Enter a valid end time';
  else if (!Number.isNaN(startTime.getTime()) && endTime <= startTime) errors.endTime = 'End time must be after the start time';
  else if (!Number.isNaN(startTime.getTime()) && endTime - startTime > 24 * 60 * 60 * 1000) errors.endTime = 'A reservation cannot exceed 24 hours';

  for (const field of ['_id', 'user', 'status', 'checkedInAt', 'checkedOutAt', 'cancelledAt', 'durationMinutes', 'createdAt']) {
    if (Object.hasOwn(source, field)) errors[field] = `${field} is managed by the server`;
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  request.body = { vehicle, area, slot, startTime, endTime };
  return next();
}

function validateReservationId(request, response, next) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) {
    return response.status(400).json({ success: false, message: 'Invalid reservation id' });
  }
  return next();
}

module.exports = { validateReservationCreate, validateReservationId };
