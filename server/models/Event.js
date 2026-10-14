const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true, index: true },
    name: { type: String, required: [true, 'Event name is required'], trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    startsAt: { type: Date, required: [true, 'Start time is required'] },
    endsAt: { type: Date, required: [true, 'End time is required'] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (_document, result) => { delete result.__v; return result; } },
  },
);

eventSchema.index({ startsAt: 1, endsAt: 1 });

module.exports = mongoose.model('Event', eventSchema);
