const mongoose = require('mongoose');
const { VEHICLE_TYPES } = require('./Vehicle');

const AREA_STATUSES = ['OPEN', 'FULL', 'CLOSED', 'MAINTENANCE'];

const parkingAreaSchema = new mongoose.Schema(
  {
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Destination',
      default: null,
      index: true,
    },
    isOverflow: { type: Boolean, default: false },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
    walkingMinutes: { type: Number, min: 0, max: 120, default: 3 },
    pricePerHour: { type: Number, min: 0, max: 10000, default: 20 },
    covered: { type: Boolean, default: true },
    cctv: { type: Boolean, default: true },
    evCharging: { type: Boolean, default: false },
    name: {
      type: String,
      required: [true, 'Parking area name is required'],
      trim: true,
      minlength: [2, 'Name must contain at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      minlength: [2, 'Location must contain at least 2 characters'],
      maxlength: [160, 'Location cannot exceed 160 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [10000, 'Capacity cannot exceed 10000'],
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be a whole number',
      },
    },
    allowedVehicleTypes: {
      type: [{ type: String, enum: VEHICLE_TYPES }],
      required: true,
      validate: {
        validator: (types) => Array.isArray(types) && types.length > 0,
        message: 'Select at least one allowed vehicle type',
      },
    },
    status: {
      type: String,
      enum: AREA_STATUSES,
      default: 'OPEN',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_document, result) => {
        delete result.__v;
        return result;
      },
    },
  },
);

module.exports = mongoose.model('ParkingArea', parkingAreaSchema);
module.exports.AREA_STATUSES = AREA_STATUSES;
