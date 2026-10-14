const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');

async function protect(request, _response, next) {
  try {
    const authorization = request.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(match[1]);
    const user = await User.findById(payload.sub);

    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    request.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError('Invalid or expired token', 401));
  }
}

function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    return next();
  };
}

module.exports = { protect, requireRole };
