const mongoose = require('mongoose');

const VEHICLE_TYPES = ['CAR', 'MOTORCYCLE', 'SCOOTER', 'BICYCLE'];

const vehicleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{5,15}$/, 'Enter a valid registration number'],
    },
    type: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: VEHICLE_TYPES,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
      maxlength: [60, 'Vehicle model cannot exceed 60 characters'],
    },
    color: {
      type: String,
      required: [true, 'Vehicle color is required'],
      trim: true,
      maxlength: [30, 'Vehicle color cannot exceed 30 characters'],
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

module.exports = mongoose.model('Vehicle', vehicleSchema);
module.exports.VEHICLE_TYPES = VEHICLE_TYPES;
