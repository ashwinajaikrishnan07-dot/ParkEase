const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;
const PROTECTED_FIELDS = ['_id', 'password', 'role', 'createdAt'];

function validateProfileUpdate(request, response, next) {
  const source = request.body || {};
  const name = typeof source.name === 'string' ? source.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  const phone = typeof source.phone === 'string' ? source.phone.replace(/[\s()-]/g, '') : '';
  const errors = {};

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Name must contain between 2 and 80 characters';
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = 'Enter a valid email address';
  }
  if (!PHONE_PATTERN.test(phone)) {
    errors.phone = 'Enter a valid phone number containing 10 to 15 digits';
  }

  for (const field of PROTECTED_FIELDS) {
    if (Object.hasOwn(source, field)) errors[field] = `${field} cannot be changed here`;
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  request.body = { name, email, phone };
  return next();
}

module.exports = { validateProfileUpdate };
