const mongoose = require('mongoose');

const WAITLIST_STATUSES = ['WAITING', 'NOTIFIED', 'CLOSED'];

const waitlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    area: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea', required: true, immutable: true, index: true },
    status: { type: String, enum: WAITLIST_STATUSES, default: 'WAITING', index: true },
    notifiedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (_document, result) => { delete result.__v; return result; } },
  },
);

// One active waitlist entry per user+area (WAITING or NOTIFIED); CLOSED entries are historical.
waitlistSchema.index({ user: 1, area: 1, status: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
module.exports.WAITLIST_STATUSES = WAITLIST_STATUSES;
