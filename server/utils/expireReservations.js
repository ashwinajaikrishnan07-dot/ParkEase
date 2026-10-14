const ParkingSlot = require('../models/ParkingSlot');
const Reservation = require('../models/Reservation');
const { createNotification } = require('./notify');
const { notifyNextInLine } = require('../controllers/waitlistController');

// Releases slots held by ACTIVE reservations whose window has fully passed
// without a check-in. Without this, a no-show would hold its slot forever and
// corrupt availability. Each reservation is expired atomically.
async function expireStaleReservations(now = new Date()) {
  const stale = await Reservation.find({ status: 'ACTIVE', endTime: { $lt: now } }).select('_id slot area user');
  let expired = 0;

  for (const reservation of stale) {
    const claimed = await Reservation.findOneAndUpdate(
      { _id: reservation._id, status: 'ACTIVE' },
      { $set: { status: 'EXPIRED' } },
      { returnDocument: 'after' },
    );
    if (!claimed) continue; // someone else transitioned it first

    await ParkingSlot.updateOne(
      { _id: claimed.slot, status: 'RESERVED', currentReservation: claimed._id },
      { $set: { status: 'AVAILABLE' }, $unset: { currentReservation: 1 } },
    );
    await notifyNextInLine(claimed.area);
    await createNotification(
      claimed.user,
      'SYSTEM',
      'Reservation expired',
      'Your reservation window passed without a check-in, so the slot was released.',
      { reservationId: claimed._id, areaId: claimed.area },
    );
    expired += 1;
  }

  return expired;
}

module.exports = { expireStaleReservations };
