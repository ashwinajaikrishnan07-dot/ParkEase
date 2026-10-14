const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

async function listNotifications(request, response) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: request.user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ user: request.user._id, read: false }),
  ]);
  response.status(200).json({ success: true, message: 'Notifications retrieved', data: { notifications, unreadCount } });
}

async function markRead(request, response) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) throw new AppError('Invalid notification id', 400);
  const updated = await Notification.findOneAndUpdate(
    { _id: request.params.id, user: request.user._id },
    { $set: { read: true } },
    { returnDocument: 'after' },
  );
  if (!updated) throw new AppError('Notification not found', 404);
  response.status(200).json({ success: true, message: 'Notification marked read', data: { notification: updated } });
}

async function markAllRead(request, response) {
  await Notification.updateMany({ user: request.user._id, read: false }, { $set: { read: true } });
  response.status(200).json({ success: true, message: 'All notifications marked read', data: { unreadCount: 0 } });
}

async function clearAll(request, response) {
  await Notification.deleteMany({ user: request.user._id });
  response.status(200).json({ success: true, message: 'Notifications cleared', data: { notifications: [], unreadCount: 0 } });
}

module.exports = { listNotifications, markRead, markAllRead, clearAll };
