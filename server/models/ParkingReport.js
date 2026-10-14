const mongoose = require('mongoose');

const REPORT_STATUSES = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
const VIOLATION_TYPES = [
  'NO_VALID_RESERVATION',
  'WRONG_SLOT',
  'RESTRICTED_SLOT',
  'ACCESSIBLE_SLOT_MISUSE',
  'EV_SLOT_MISUSE',
  'BLOCKING_OR_OBSTRUCTING',
  'OTHER',
];

const parkingReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    area: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea', required: true, immutable: true, index: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSlot', required: true, immutable: true, index: true },
    vehicleNumber: { type: String, required: true, uppercase: true, trim: true, match: [/^[A-Z0-9]{5,15}$/, 'Enter a valid vehicle number'] },
    violationType: { type: String, required: true, enum: VIOLATION_TYPES },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    imageUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    status: { type: String, enum: REPORT_STATUSES, default: 'PENDING', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (_document, result) => { delete result.__v; return result; } },
  },
);

parkingReportSchema.index({ reporter: 1, createdAt: -1 });
parkingReportSchema.index({ status: 1, createdAt: -1 });
parkingReportSchema.index({ area: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ParkingReport', parkingReportSchema);
module.exports.REPORT_STATUSES = REPORT_STATUSES;
module.exports.VIOLATION_TYPES = VIOLATION_TYPES;
