const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true, immutable: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (_document, result) => { delete result.__v; return result; } },
  },
);

favoriteSchema.index({ user: 1, destination: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
