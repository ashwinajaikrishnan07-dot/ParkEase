const mongoose = require('mongoose');

const occupancyHistorySchema = new mongoose.Schema(
  {
    area: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea', required: true, index: true },
    occupiedCount: { type: Number, required: true, min: 0 },
    availableCount: { type: Number, required: true, min: 0 },
    occupancyPercentage: { type: Number, required: true, min: 0, max: 100 },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  {
    toJSON: { transform: (_document, result) => { delete result.__v; return result; } },
  },
);

occupancyHistorySchema.index({ area: 1, recordedAt: -1 });

module.exports = mongoose.model('OccupancyHistory', occupancyHistorySchema);
