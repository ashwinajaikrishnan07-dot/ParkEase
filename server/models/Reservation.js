const mongoose = require('mongoose');

const RESERVATION_STATUSES = ['ACTIVE', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'EXPIRED'];

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, immutable: true, index: true },
    area: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea', required: true, immutable: true, index: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSlot', required: true, immutable: true, index: true },
    startTime: { type: Date, required: [true, 'Start time is required'], immutable: true },
    endTime: { type: Date, required: [true, 'End time is required'] },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'ACTIVE', index: true },
    checkedInAt: { type: Date, default: null },
    checkedOutAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: null, min: 0 },
    pricePerHour: { type: Number, default: 0, min: 0 },
    estimatedCost: { type: Number, default: 0, min: 0 },
    finalCost: { type: Number, default: null, min: 0 },
    overstayMinutes: { type: Number, default: 0, min: 0 },
    overstayFee: { type: Number, default: 0, min: 0 },
    extendedCount: { type: Number, default: 0, min: 0 },
    cancelledBy: { type: String, enum: ['USER', 'OPERATOR', 'ADMIN', null], default: null },
    refundStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'ELIGIBLE', 'PENDING', 'APPROVED', 'PROCESSED', 'REJECTED', 'FAILED', null],
      default: null,
    },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundReason: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (_document, result) => { delete result.__v; return result; } },
  },
);

reservationSchema.index({ user: 1, createdAt: -1 });
reservationSchema.index({ slot: 1, status: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ vehicle: 1, status: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
module.exports.RESERVATION_STATUSES = RESERVATION_STATUSES;
