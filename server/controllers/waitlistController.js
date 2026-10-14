const mongoose = require('mongoose');
const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');
const Waitlist = require('../models/Waitlist');
const AppError = require('../utils/AppError');
const { createNotification } = require('../utils/notify');

const population = [{ path: 'area', select: 'name location status destination' }];

async function joinWaitlist(request, response) {
  const areaId = typeof request.body.area === 'string' ? request.body.area.trim() : '';
  if (!mongoose.isObjectIdOrHexString(areaId)) throw new AppError('Invalid parking area id', 400, { area: 'Select a valid parking area' });

  const area = await ParkingArea.findById(areaId);
  if (!area) throw new AppError('Parking area not found', 404);

  const available = await ParkingSlot.countDocuments({ area: area._id, status: 'AVAILABLE' });
  if (available > 0) throw new AppError('This area has available slots — you can book directly', 409);

  const existing = await Waitlist.findOne({ user: request.user._id, area: area._id, status: { $in: ['WAITING', 'NOTIFIED'] } });
  if (existing) {
    return response.status(200).json({ success: true, message: 'Already on the waitlist', data: { entry: existing } });
  }

  const entry = await Waitlist.create({ user: request.user._id, area: area._id, status: 'WAITING' });
  return response.status(201).json({ success: true, message: 'Added to waitlist', data: { entry } });
}

async function listMyWaitlist(request, response) {
  const entries = await Waitlist.find({ user: request.user._id, status: { $in: ['WAITING', 'NOTIFIED'] } })
    .sort({ createdAt: -1 })
    .populate(population);
  response.status(200).json({ success: true, message: 'Waitlist retrieved', data: { entries } });
}

async function leaveWaitlist(request, response) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) throw new AppError('Invalid waitlist id', 400);
  const entry = await Waitlist.findById(request.params.id);
  if (!entry) throw new AppError('Waitlist entry not found', 404);
  if (!entry.user.equals(request.user._id)) throw new AppError('You do not have permission to leave this waitlist', 403);
  await Waitlist.updateOne({ _id: entry._id }, { $set: { status: 'CLOSED' } });
  response.status(200).json({ success: true, message: 'Left waitlist', data: { id: entry._id.toString() } });
}

// Called when a slot in an area is released; notifies the oldest waiting user (FIFO).
async function notifyNextInLine(areaId) {
  const next = await Waitlist.findOneAndUpdate(
    { area: areaId, status: 'WAITING' },
    { $set: { status: 'NOTIFIED', notifiedAt: new Date() } },
    { sort: { createdAt: 1 }, returnDocument: 'after' },
  );
  if (next) {
    const area = await ParkingArea.findById(areaId).select('name');
    await createNotification(
      next.user,
      'WAITLIST',
      'A spot opened up',
      `A slot is now free at ${area?.name || 'your waitlisted area'}. Book now before it is taken.`,
      { areaId },
    );
  }
  return next;
}

module.exports = { joinWaitlist, leaveWaitlist, listMyWaitlist, notifyNextInLine };
