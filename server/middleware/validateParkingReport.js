const mongoose = require('mongoose');
const { REPORT_STATUSES, VIOLATION_TYPES } = require('../models/ParkingReport');
const REVIEW_STATUSES = REPORT_STATUSES.filter((status) => status !== 'PENDING');

function normalizeVehicleNumber(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/[\s-]/g, '') : '';
}
function validationError(response, errors) {
  return response.status(400).json({ success: false, message: 'Validation failed', errors });
}
function validateImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateReportCreate(request, response, next) {
  const source = request.body || {};
  const area = typeof source.area === 'string' ? source.area.trim() : '';
  const slot = typeof source.slot === 'string' ? source.slot.trim() : '';
  const vehicleNumber = normalizeVehicleNumber(source.vehicleNumber);
  const violationType = typeof source.violationType === 'string' ? source.violationType.trim().toUpperCase() : '';
  const description = typeof source.description === 'string' ? source.description.trim().replace(/\s+/g, ' ') : '';
  const imageUrl = typeof source.imageUrl === 'string' ? source.imageUrl.trim() : '';
  const errors = {};

  if (!mongoose.isObjectIdOrHexString(area)) errors.area = 'Select a valid parking area';
  if (!mongoose.isObjectIdOrHexString(slot)) errors.slot = 'Select a valid parking slot';
  if (!/^[A-Z0-9]{5,15}$/.test(vehicleNumber)) errors.vehicleNumber = 'Vehicle number must contain 5 to 15 letters or digits';
  if (!VIOLATION_TYPES.includes(violationType)) errors.violationType = `Select one of: ${VIOLATION_TYPES.join(', ')}`;
  if (description.length < 10 || description.length > 1000) errors.description = 'Description must contain between 10 and 1000 characters';
  if (imageUrl.length > 2048 || !validateImageUrl(imageUrl)) errors.imageUrl = 'Enter a valid HTTP or HTTPS image URL without credentials';
  for (const field of ['_id', 'reporter', 'status', 'reviewedBy', 'reviewedAt', 'createdAt']) if (Object.hasOwn(source, field)) errors[field] = `${field} is managed by the server`;

  if (Object.keys(errors).length) return validationError(response, errors);
  request.body = { area, slot, vehicleNumber, violationType, description, imageUrl };
  return next();
}

function validateReportId(request, response, next) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) return response.status(400).json({ success: false, message: 'Invalid report id' });
  return next();
}

function validateReportStatus(request, response, next) {
  const source = request.body || {};
  const status = typeof source.status === 'string' ? source.status.trim().toUpperCase() : '';
  const errors = {};
  if (!REVIEW_STATUSES.includes(status)) errors.status = `Status must be one of: ${REVIEW_STATUSES.join(', ')}`;
  for (const field of Object.keys(source)) if (field !== 'status') errors[field] = `${field} cannot be changed here`;
  if (Object.keys(errors).length) return validationError(response, errors);
  request.body = { status };
  return next();
}

function validateReportFilters(request, response, next) {
  const errors = {};
  if (request.query.status && !REPORT_STATUSES.includes(request.query.status.toUpperCase())) errors.status = 'Invalid report status filter';
  if (request.query.violationType && !VIOLATION_TYPES.includes(request.query.violationType.toUpperCase())) errors.violationType = 'Invalid violation type filter';
  if (request.query.area && !mongoose.isObjectIdOrHexString(request.query.area)) errors.area = 'Invalid parking area filter';
  if (Object.keys(errors).length) return response.status(400).json({ success: false, message: 'Invalid filters', errors });
  return next();
}

module.exports = { validateReportCreate, validateReportFilters, validateReportId, validateReportStatus };
