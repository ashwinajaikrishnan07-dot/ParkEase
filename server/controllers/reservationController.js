const mongoose = require('mongoose');
const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');
const Reservation = require('../models/Reservation');
const Vehicle = require('../models/Vehicle');
const AppError = require('../utils/AppError');
const { recordOccupancy } = require('../utils/recordOccupancy');
const { createNotification } = require('../utils/notify');
const {
  billableHours,
  estimateCost,
  overstayMinutes,
  overstayFee,
  overstayStatus,
  refundQuote,
} = require('../utils/pricing');
const { notifyNextInLine } = require('./waitlistController');

const population = [
  { path: 'vehicle', select: 'registrationNumber type model color' },
  { path: 'area', select: 'name location status pricePerHour' },
  { path: 'slot', select: 'slotNumber vehicleType category status' },
];
const LIVE_STATUSES = ['ACTIVE', 'CHECKED_IN'];

const populatedReservation = (id) => Reservation.findById(id).populate(population);

// Attach a live overstay snapshot so clients can warn drivers before checkout.
function serialize(reservation) {
  if (!reservation) return reservation;
  const json = typeof reservation.toJSON === 'function' ? reservation.toJSON() : reservation;
  return { ...json, overstay: overstayStatus(json) };
}

const shortRef = (id) => `PW${id.toString().slice(-6).toUpperCase()}`;

async function authorizedReservation(request, action) {
  const reservation = await Reservation.findById(request.params.id);
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (!reservation.user.equals(request.user._id) && request.user.role !== 'admin') {
    throw new AppError(`You do not have permission to ${action} this reservation`, 403);
  }
  return reservation;
}

async function createReservation(request, response) {
  const { area: areaId, endTime, slot: slotId, startTime, vehicle: vehicleId } = request.body;
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  if (!vehicle.owner.equals(request.user._id)) throw new AppError('You can only reserve with your own vehicle', 403);

  const [area, slot] = await Promise.all([ParkingArea.findById(areaId), ParkingSlot.findById(slotId)]);
  if (!area) throw new AppError('Parking area not found', 404);
  if (!slot || !slot.area.equals(area._id)) throw new AppError('Parking slot not found in this area', 404);
  if (area.status !== 'OPEN') throw new AppError('Parking area is not open for reservations', 409);
  if (vehicle.type !== slot.vehicleType) throw new AppError('Selected vehicle is not compatible with this slot', 409, { vehicle: `Choose a ${slot.vehicleType.toLowerCase()} vehicle` });
  if (slot.category === 'FACULTY' && !['faculty', 'admin'].includes(request.user.role)) throw new AppError('This slot is reserved for faculty', 403);

  const overlap = { status: { $in: LIVE_STATUSES }, startTime: { $lt: endTime }, endTime: { $gt: startTime } };
  const slotConflict = await Reservation.exists({ ...overlap, slot: slot._id });
  if (slotConflict) throw new AppError('This slot is already booked for the selected time. Please pick another slot or time.', 409, { slot: 'Slot already booked for this time' });
  const vehicleConflict = await Reservation.exists({ ...overlap, vehicle: vehicle._id });
  if (vehicleConflict) throw new AppError('This vehicle already has a booking that overlaps this time. Choose a different time or vehicle.', 409, { vehicle: 'Vehicle already booked for this time' });

  const reservationId = new mongoose.Types.ObjectId();
  const claimedSlot = await ParkingSlot.findOneAndUpdate(
    { _id: slot._id, area: area._id, status: 'AVAILABLE', currentReservation: null },
    { $set: { status: 'RESERVED', currentReservation: reservationId } },
    { returnDocument: 'after' },
  );
  if (!claimedSlot) throw new AppError('Parking slot is no longer available', 409);

  const pricePerHour = Number.isFinite(area.pricePerHour) ? area.pricePerHour : 0;
  const estimatedCost = estimateCost(pricePerHour, startTime, endTime);

  let reservation;
  try {
    reservation = await Reservation.create({ _id: reservationId, user: request.user._id, vehicle: vehicle._id, area: area._id, slot: slot._id, startTime, endTime, status: 'ACTIVE', pricePerHour, estimatedCost });
  } catch (error) {
    await ParkingSlot.updateOne(
      { _id: slot._id, status: 'RESERVED', currentReservation: reservationId },
      { $set: { status: 'AVAILABLE' }, $unset: { currentReservation: 1 } },
    );
    throw error;
  }

  await createNotification(
    request.user._id,
    'BOOKING',
    'Booking confirmed',
    `Slot ${slot.slotNumber} at ${area.name} is reserved. Estimated ₹${estimatedCost}.`,
    { reservationId: reservation._id, areaId: area._id },
  );

  response.status(201).json({ success: true, message: 'Reservation created successfully', data: { reservation: serialize(await populatedReservation(reservation._id)) } });
}

async function listMyReservations(request, response) {
  const reservations = await Reservation.find({ user: request.user._id }).sort({ createdAt: -1 }).populate(population);
  response.status(200).json({ success: true, message: 'Reservations retrieved', data: { reservations: reservations.map(serialize) } });
}

async function getReservation(request, response) {
  await authorizedReservation(request, 'view');
  response.status(200).json({ success: true, message: 'Reservation retrieved', data: { reservation: serialize(await populatedReservation(request.params.id)) } });
}

async function cancelReservation(request, response) {
  const reservation = await authorizedReservation(request, 'cancel');
  if (reservation.status !== 'ACTIVE') throw new AppError('Only active reservations can be cancelled', 409);
  const cancelledAt = new Date();
  // Staff cancellations (admin/operator) always get a full refund per policy.
  const byStaff = request.user.role === 'admin' || request.user.role === 'operator';
  const cancelledBy = byStaff ? (request.user.role === 'admin' ? 'ADMIN' : 'OPERATOR') : 'USER';
  const quote = refundQuote(reservation, { atTime: cancelledAt.getTime(), byStaff });
  const cancelled = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: 'ACTIVE' },
    { $set: { status: 'CANCELLED', cancelledAt, cancelledBy, refundStatus: quote.refundStatus, refundAmount: quote.refundAmount, refundReason: quote.refundReason } },
    { returnDocument: 'after' },
  );
  if (!cancelled) throw new AppError('Reservation status changed before cancellation', 409);

  const released = await ParkingSlot.updateOne(
    { _id: cancelled.slot, status: 'RESERVED', currentReservation: cancelled._id },
    { $set: { status: 'AVAILABLE' }, $unset: { currentReservation: 1 } },
  );
  if (released.modifiedCount !== 1) {
    await Reservation.updateOne(
      { _id: cancelled._id, status: 'CANCELLED', cancelledAt },
      { $set: { status: 'ACTIVE' }, $unset: { cancelledAt: 1, cancelledBy: 1, refundStatus: 1, refundAmount: 1, refundReason: 1 } },
    );
    throw new AppError('Reservation slot could not be released', 409);
  }

  await notifyNextInLine(cancelled.area);
  const refundNote = quote.refundAmount > 0 ? ` Refund of ₹${quote.refundAmount} is ${quote.refundStatus.toLowerCase()} (simulated).` : ' No refund applies per policy.';
  await createNotification(
    cancelled.user,
    'CANCEL',
    'Booking cancelled',
    `Your reservation was cancelled and the slot released.${refundNote}`,
    { reservationId: cancelled._id, areaId: cancelled.area, refundStatus: quote.refundStatus, refundAmount: quote.refundAmount },
  );
  response.status(200).json({ success: true, message: 'Reservation cancelled', data: { reservation: serialize(await populatedReservation(cancelled._id)) } });
}

async function checkInReservation(request, response) {
  const reservation = await authorizedReservation(request, 'check in to');
  if (reservation.status !== 'ACTIVE') throw new AppError('Only active reservations can be checked in', 409);

  const checkedInAt = new Date();
  const opensAt = new Date(reservation.startTime.getTime() - 15 * 60 * 1000);
  if (checkedInAt < opensAt) throw new AppError(`Check-in opens at ${opensAt.toISOString()}`, 409);
  if (checkedInAt >= reservation.endTime) throw new AppError('The reservation check-in window has closed', 409);

  const occupied = await ParkingSlot.updateOne(
    { _id: reservation.slot, status: 'RESERVED', currentReservation: reservation._id },
    { $set: { status: 'OCCUPIED' } },
  );
  if (occupied.modifiedCount !== 1) throw new AppError('Reserved parking slot is not available for check-in', 409);

  const checkedIn = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: 'ACTIVE' },
    { $set: { status: 'CHECKED_IN', checkedInAt } },
    { returnDocument: 'after' },
  );
  if (!checkedIn) {
    await ParkingSlot.updateOne(
      { _id: reservation.slot, status: 'OCCUPIED', currentReservation: reservation._id },
      { $set: { status: 'RESERVED' } },
    );
    throw new AppError('Reservation status changed before check-in', 409);
  }

  await createNotification(
    checkedIn.user,
    'CHECKIN',
    'Checked in',
    'You are checked in and your slot is now occupied. Remember to check out before your end time.',
    { reservationId: checkedIn._id, areaId: checkedIn.area },
  );
  response.status(200).json({ success: true, message: 'Checked in successfully', data: { reservation: serialize(await populatedReservation(checkedIn._id)) } });
}

async function checkOutReservation(request, response) {
  const reservation = await authorizedReservation(request, 'check out of');
  if (reservation.status !== 'CHECKED_IN' || !reservation.checkedInAt) throw new AppError('Only checked-in reservations can be checked out', 409);

  const checkedOutAt = new Date();
  const durationMinutes = Math.max(0, Math.ceil((checkedOutAt - reservation.checkedInAt) / 60000));
  const lateMinutes = overstayMinutes(reservation.endTime, checkedOutAt);
  const lateFee = overstayFee(reservation.pricePerHour, lateMinutes);
  const baseCost = reservation.estimatedCost || estimateCost(reservation.pricePerHour, reservation.startTime, reservation.endTime);
  const finalCost = baseCost + lateFee;
  const completed = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: 'CHECKED_IN' },
    { $set: { status: 'COMPLETED', checkedOutAt, durationMinutes, overstayMinutes: lateMinutes, overstayFee: lateFee, finalCost } },
    { returnDocument: 'after' },
  );
  if (!completed) throw new AppError('Reservation status changed before check-out', 409);

  const released = await ParkingSlot.updateOne(
    { _id: completed.slot, status: 'OCCUPIED', currentReservation: completed._id },
    { $set: { status: 'AVAILABLE' }, $unset: { currentReservation: 1 } },
  );
  if (released.modifiedCount !== 1) {
    await Reservation.updateOne(
      { _id: completed._id, status: 'COMPLETED', checkedOutAt },
      { $set: { status: 'CHECKED_IN' }, $unset: { checkedOutAt: 1, durationMinutes: 1 } },
    );
    throw new AppError('Occupied parking slot could not be released', 409);
  }

  await recordOccupancy(completed.area);
  await notifyNextInLine(completed.area);
  const feeNote = lateFee > 0 ? ` An overstay fee of ₹${lateFee} (${lateMinutes} min late) was added.` : '';
  await createNotification(
    completed.user,
    lateFee > 0 ? 'OVERSTAY' : 'CHECKOUT',
    lateFee > 0 ? 'Checked out — overstay fee applied' : 'Checked out',
    `Thanks for parking with ParkEase. Total ₹${finalCost}.${feeNote}`,
    { reservationId: completed._id, areaId: completed.area, finalCost, overstayFee: lateFee },
  );
  response.status(200).json({ success: true, message: 'Checked out successfully', data: { reservation: serialize(await populatedReservation(completed._id)) } });
}

// Security/admin booking verification (QR scan target is the reservation id).
async function verifyReservation(request, response) {
  const reservation = await populatedReservation(request.params.id);
  if (!reservation) throw new AppError('Reservation not found', 404);

  const now = Date.now();
  const start = new Date(reservation.startTime).getTime();
  const end = new Date(reservation.endTime).getTime();
  const graceStart = start - 15 * 60 * 1000;

  let valid = false;
  let reason;
  if (reservation.status === 'CANCELLED') reason = 'Reservation was cancelled';
  else if (reservation.status === 'COMPLETED') reason = 'Reservation already completed';
  else if (now < graceStart) { reason = 'Too early — check-in opens 15 minutes before start'; }
  else if (now > end) { reason = 'Reservation window has ended'; }
  else { valid = true; reason = reservation.status === 'CHECKED_IN' ? 'Checked in and parked' : 'Valid for entry'; }

  response.status(200).json({ success: true, message: 'Reservation verified', data: { valid, reason, reservation: serialize(reservation) } });
}

// Extend an active or checked-in reservation to a later end time.
async function extendReservation(request, response) {
  const reservation = await authorizedReservation(request, 'extend');
  if (!LIVE_STATUSES.includes(reservation.status)) throw new AppError('Only active or checked-in reservations can be extended', 409);

  const newEnd = new Date(request.body.endTime);
  if (Number.isNaN(newEnd.getTime())) throw new AppError('Enter a valid new end time', 400, { endTime: 'Invalid end time' });
  if (newEnd <= reservation.endTime) throw new AppError('New end time must be later than the current end time', 400, { endTime: 'Choose a later time' });
  if (newEnd.getTime() - reservation.startTime.getTime() > 24 * 60 * 60 * 1000) throw new AppError('A reservation cannot exceed 24 hours in total', 400, { endTime: 'Total duration cannot exceed 24 hours' });

  const area = await ParkingArea.findById(reservation.area);
  if (!area || area.status !== 'OPEN') throw new AppError('Parking area is not open for changes', 409);

  const conflict = await Reservation.exists({
    _id: { $ne: reservation._id },
    status: { $in: LIVE_STATUSES },
    startTime: { $lt: newEnd },
    endTime: { $gt: reservation.endTime },
    $or: [{ slot: reservation.slot }, { vehicle: reservation.vehicle }],
  });
  if (conflict) throw new AppError('The slot or vehicle is already booked during the extended window', 409);

  const pricePerHour = reservation.pricePerHour || (Number.isFinite(area.pricePerHour) ? area.pricePerHour : 0);
  const estimatedCost = estimateCost(pricePerHour, reservation.startTime, newEnd);
  const updated = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: { $in: LIVE_STATUSES } },
    { $set: { endTime: newEnd, pricePerHour, estimatedCost }, $inc: { extendedCount: 1 } },
    { returnDocument: 'after' },
  );
  if (!updated) throw new AppError('Reservation status changed before it could be extended', 409);

  const added = Math.max(1, Math.round((newEnd - reservation.endTime) / 3600000));
  await createNotification(
    updated.user,
    'EXTEND',
    'Booking extended',
    `Your parking is extended by ${added} hr to ${newEnd.toLocaleString()}. New estimate ₹${estimatedCost}.`,
    { reservationId: updated._id, areaId: updated.area },
  );
  response.status(200).json({ success: true, message: 'Reservation extended', data: { reservation: serialize(await populatedReservation(updated._id)) } });
}

// Structured receipt payload for a reservation (owner/admin only).
async function getReceipt(request, response) {
  await authorizedReservation(request, 'view the receipt for');
  const reservation = await populatedReservation(request.params.id);
  if (reservation.status === 'CANCELLED') throw new AppError('No receipt is available for a cancelled booking', 409);

  const hours = billableHours(reservation.startTime, reservation.endTime);
  const base = reservation.estimatedCost || estimateCost(reservation.pricePerHour, reservation.startTime, reservation.endTime);
  const settled = reservation.status === 'COMPLETED';
  const overstayFeeAmount = settled ? reservation.overstayFee : overstayStatus(reservation.toJSON()).fee;
  const total = settled ? (reservation.finalCost ?? base + overstayFeeAmount) : base;

  const receipt = {
    receiptNumber: shortRef(reservation._id),
    issuedAt: new Date(),
    status: settled ? 'PAID' : 'RESERVED',
    customer: { name: request.user.name, email: request.user.email },
    area: reservation.area?.name,
    location: reservation.area?.location,
    slot: reservation.slot?.slotNumber,
    vehicle: reservation.vehicle?.registrationNumber,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    checkedInAt: reservation.checkedInAt,
    checkedOutAt: reservation.checkedOutAt,
    durationMinutes: reservation.durationMinutes,
    lineItems: [
      { label: `Parking (${hours} hr @ ₹${reservation.pricePerHour}/hr)`, amount: base },
      ...(overstayFeeAmount > 0 ? [{ label: `Overstay fee (${reservation.overstayMinutes || overstayStatus(reservation.toJSON()).minutes} min)`, amount: overstayFeeAmount }] : []),
    ],
    total,
  };
  response.status(200).json({ success: true, message: 'Receipt generated', data: { receipt } });
}

// Aggregated parking spend for the signed-in user (expense tracker).
async function getExpenses(request, response) {
  const userId = request.user._id;
  const completed = await Reservation.find({ user: userId, status: 'COMPLETED' })
    .sort({ checkedOutAt: -1 })
    .populate([{ path: 'area', select: 'name location' }]);

  const spent = (r) => (r.finalCost ?? r.estimatedCost ?? 0);
  const totalSpent = completed.reduce((sum, r) => sum + spent(r), 0);
  const totalVisits = completed.length;

  const now = new Date();
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = monthKey(now);

  const byMonthMap = new Map();
  const byAreaMap = new Map();
  let thisMonthSpent = 0;
  let totalOverstayFees = 0;

  for (const r of completed) {
    const when = r.checkedOutAt || r.createdAt;
    const key = monthKey(new Date(when));
    const amount = spent(r);
    byMonthMap.set(key, (byMonthMap.get(key) || 0) + amount);
    if (key === thisMonth) thisMonthSpent += amount;
    totalOverstayFees += r.overstayFee || 0;
    const areaName = r.area?.name || 'Unknown area';
    const prev = byAreaMap.get(areaName) || { area: areaName, total: 0, visits: 0 };
    prev.total += amount;
    prev.visits += 1;
    byAreaMap.set(areaName, prev);
  }

  // Last 6 months, oldest first, zero-filled.
  const byMonth = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    byMonth.push({ month: key, label: d.toLocaleString(undefined, { month: 'short' }), total: byMonthMap.get(key) || 0 });
  }

  const byArea = [...byAreaMap.values()].sort((a, b) => b.total - a.total);

  // Committed but not yet settled (upcoming + parked).
  const live = await Reservation.find({ user: userId, status: { $in: LIVE_STATUSES } });
  const committed = live.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

  response.status(200).json({
    success: true,
    message: 'Expense summary generated',
    data: {
      summary: {
        totalSpent,
        totalVisits,
        thisMonthSpent,
        avgPerVisit: totalVisits ? Math.round(totalSpent / totalVisits) : 0,
        totalOverstayFees,
        committed,
      },
      byMonth,
      byArea,
      recent: completed.slice(0, 8).map((r) => ({
        id: r._id,
        area: r.area?.name,
        amount: spent(r),
        overstayFee: r.overstayFee || 0,
        date: r.checkedOutAt || r.createdAt,
      })),
    },
  });
}

module.exports = {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  createReservation,
  extendReservation,
  getExpenses,
  getReceipt,
  getReservation,
  listMyReservations,
  verifyReservation,
};
