const mongoose = require('mongoose');

const DESTINATION_CATEGORIES = [
  'COLLEGE',
  'MALL',
  'HOSPITAL',
  'OFFICE',
  'THEATRE',
  'RESTAURANT',
  'HOTEL',
  'TEMPLE',
  'PUBLIC_PLACE',
  'EVENT_VENUE',
  'BUS_STAND',
  'OTHER',
];

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Destination name is required'], trim: true, minlength: 2, maxlength: 120 },
    category: { type: String, required: true, enum: DESTINATION_CATEGORIES, index: true },
    address: { type: String, trim: true, maxlength: 240, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '', index: true },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    imageAttribution: { type: String, trim: true, maxlength: 240, default: '' },
    googlePhoto: { type: Boolean, default: false },
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (_document, result) => { delete result.__v; return result; } },
  },
);

destinationSchema.index({ name: 'text', address: 'text' });

module.exports = mongoose.model('Destination', destinationSchema);
module.exports.DESTINATION_CATEGORIES = DESTINATION_CATEGORIES;
