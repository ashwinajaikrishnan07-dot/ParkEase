const AppError = require('../utils/AppError');

function createRateLimiter({ max, windowMs }) {
  const hits = new Map();

  return function rateLimiter(request, _response, next) {
    const now = Date.now();
    const key = request.ip || request.socket?.remoteAddress || 'unknown';
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return next(new AppError(`Too many attempts. Try again in ${retryAfter} seconds.`, 429));
    } else {
      entry.count += 1;
    }

    if (hits.size > 5000) {
      for (const [mapKey, value] of hits) {
        if (now > value.resetAt) hits.delete(mapKey);
      }
    }

    return next();
  };
}

module.exports = { createRateLimiter };
