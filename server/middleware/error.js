const AppError = require('../utils/AppError');

function notFound(request, _response, next) {
  next(new AppError(`Route not found: ${request.method} ${request.originalUrl}`, 404));
}

function errorHandler(error, _request, response, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.isOperational ? error.message : 'An unexpected error occurred';
  let details = error.details;

  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || error.keyValue || {});
    statusCode = 409;

    if (fields.includes('slotNumber')) {
      message = 'This slot number already exists in the selected parking area';
      details = { slotNumber: 'Choose a different slot number' };
    } else if (fields.includes('registrationNumber')) {
      message = 'A vehicle with this registration number already exists';
      details = { registrationNumber: 'This registration number is already registered' };
    } else {
      message = 'An account with this email already exists';
      details = { email: 'This email address is already in use' };
    }
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.fromEntries(Object.entries(error.errors).map(([field, issue]) => [field, issue.message]));
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path}`;
  } else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    statusCode = 400;
    message = 'Request body contains invalid JSON';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large';
  }

  if (statusCode >= 500) console.error(error);
  const payload = { success: false, message };
  if (details) payload.errors = details;
  response.status(statusCode).json(payload);
}

module.exports = { errorHandler, notFound };
