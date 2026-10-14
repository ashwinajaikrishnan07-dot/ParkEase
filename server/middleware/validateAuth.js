const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

function sendValidationError(response, errors) {
  return response.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
}

function validateRegister(request, response, next) {
  const source = request.body || {};
  const name = typeof source.name === 'string' ? source.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  const password = typeof source.password === 'string' ? source.password : '';
  const phone = typeof source.phone === 'string' ? source.phone.replace(/[\s()-]/g, '') : '';
  const errors = {};

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Name must contain between 2 and 80 characters';
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = 'Enter a valid email address';
  }
  if (password.length < 8 || password.length > 72) {
    errors.password = 'Password must contain between 8 and 72 characters';
  }
  if (!PHONE_PATTERN.test(phone)) {
    errors.phone = 'Enter a valid phone number containing 10 to 15 digits';
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(response, errors);
  }

  // Role is never taken from the client. Ordinary signups are always `user`;
  // elevated roles are granted only by an administrator.
  request.body = { name, email, password, phone, role: 'user' };
  return next();
}

function validateLogin(request, response, next) {
  const source = request.body || {};
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  const password = typeof source.password === 'string' ? source.password : '';
  const errors = {};

  if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';

  if (Object.keys(errors).length > 0) {
    return sendValidationError(response, errors);
  }

  request.body = { email, password };
  return next();
}

module.exports = { validateLogin, validateRegister };
