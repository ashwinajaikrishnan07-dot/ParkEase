const mongoose = require('mongoose');

const TRAFFIC_LEVELS = ['SMOOTH', 'MODERATE', 'HEAVY'];

const trafficReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true, index: true },
    level: { type: String, enum: TRAFFIC_LEVELS, required: [true, 'Traffic level is required'] },
    comment: { type: String, trim: true, maxlength: [240, 'Comment cannot exceed 240 characters'], default: '' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (_document, result) => { delete result.__v; return result; } },
  },
);

trafficReportSchema.index({ destination: 1, createdAt: -1 });

module.exports = mongoose.model('TrafficReport', trafficReportSchema);
module.exports.TRAFFIC_LEVELS = TRAFFIC_LEVELS;
