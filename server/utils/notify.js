const Notification = require('../models/Notification');

// Best-effort notification creation. Never throws into the caller's main flow —
// a failed notification must not roll back a successful booking/checkout.
async function createNotification(userId, type, title, message, meta = {}) {
  if (!userId) return null;
  try {
    return await Notification.create({ user: userId, type, title, message, meta });
  } catch (error) {
    // Swallow: notifications are a side effect, not a critical path.
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error('Failed to create notification:', error.message);
    }
    return null;
  }
}

module.exports = { createNotification };
