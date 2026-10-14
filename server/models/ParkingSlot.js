const mongoose = require('mongoose');
const { VEHICLE_TYPES } = require('./Vehicle');

const SLOT_CATEGORIES = ['GENERAL', 'FACULTY', 'VISITOR', 'EV', 'ACCESSIBLE'];
const SLOT_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];

const parkingSlotSchema = new mongoose.Schema(
  {
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      required: true,
      index: true,
    },
    slotNumber: {
      type: String,
      required: [true, 'Slot number is required'],
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{1,12}$/, 'Enter a valid slot number'],
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: VEHICLE_TYPES,
    },
    category: {
      type: String,
      required: [true, 'Slot category is required'],
      enum: SLOT_CATEGORIES,
      default: 'GENERAL',
    },
    status: {
      type: String,
      required: [true, 'Slot status is required'],
      enum: SLOT_STATUSES,
      default: 'AVAILABLE',
    },
    currentReservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
      select: false,
      index: true,
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

parkingSlotSchema.index({ area: 1, slotNumber: 1 }, { unique: true });

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
module.exports.SLOT_CATEGORIES = SLOT_CATEGORIES;
module.exports.SLOT_STATUSES = SLOT_STATUSES;
