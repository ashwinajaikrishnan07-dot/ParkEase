const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { api, clearDatabase, createUser, startTestServer, stopTestServer, token } = require('./helpers');
const Vehicle = require('../models/Vehicle');
const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');

before(startTestServer);
after(stopTestServer);
beforeEach(clearDatabase);

async function scenario() {
  const user = await createUser({ email: 'driver@parkwise.test' });
  const vehicle = await Vehicle.create({ owner: user._id, registrationNumber: 'KL07AB1234', type: 'CAR', model: 'City', color: 'White' });
  const area = await ParkingArea.create({ name: 'Area', location: 'North', capacity: 3, allowedVehicleTypes: ['CAR'], status: 'OPEN' });
  const slot = await ParkingSlot.create({ area: area._id, slotNumber: 'A01', vehicleType: 'CAR', category: 'GENERAL', status: 'AVAILABLE' });
  return { area, slot, userToken: token(user._id), vehicle };
}

function times() {
  return { startTime: new Date(Date.now() + 5 * 60000).toISOString(), endTime: new Date(Date.now() + 65 * 60000).toISOString() };
}

test('reserves an available slot', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const result = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.reservation.status, 'ACTIVE');
});

test('rejects reserving an occupied slot', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  await ParkingSlot.updateOne({ _id: slot._id }, { status: 'OCCUPIED' });
  const result = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  assert.equal(result.status, 409);
});

test('rejects a duplicate overlapping reservation', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const body = { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() };
  await api('/api/reservations', { method: 'POST', token: userToken, body });
  const second = await api('/api/reservations', { method: 'POST', token: userToken, body });
  assert.equal(second.status, 409);
});

test('cancels, checks in, and checks out a reservation', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const created = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  const id = created.body.data.reservation._id;

  const checkIn = await api(`/api/reservations/${id}/check-in`, { method: 'POST', token: userToken });
  assert.equal(checkIn.status, 200);
  assert.equal(checkIn.body.data.reservation.status, 'CHECKED_IN');

  const checkOut = await api(`/api/reservations/${id}/check-out`, { method: 'POST', token: userToken });
  assert.equal(checkOut.status, 200);
  assert.equal(checkOut.body.data.reservation.status, 'COMPLETED');
  assert.ok(checkOut.body.data.reservation.durationMinutes >= 0);
});

test('cancels an active reservation and releases the slot', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const created = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  const cancelled = await api(`/api/reservations/${created.body.data.reservation._id}/cancel`, { method: 'PATCH', token: userToken });
  assert.equal(cancelled.status, 200);
  const releasedSlot = await ParkingSlot.findById(slot._id);
  assert.equal(releasedSlot.status, 'AVAILABLE');
});

test('cancellation within 2 hours of start yields a 50% simulated refund', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  // Start 60 min out (within the 2h cutoff) so the partial-refund branch applies.
  const startTime = new Date(Date.now() + 60 * 60000).toISOString();
  const endTime = new Date(Date.now() + 120 * 60000).toISOString();
  const created = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, startTime, endTime } });
  const estimated = created.body.data.reservation.estimatedCost;
  const cancelled = await api(`/api/reservations/${created.body.data.reservation._id}/cancel`, { method: 'PATCH', token: userToken });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.reservation.refundStatus, 'PROCESSED');
  assert.equal(cancelled.body.data.reservation.refundAmount, Math.round(estimated * 0.5));
  assert.equal(cancelled.body.data.reservation.cancelledBy, 'USER');
});

test('does not create a second refund when cancelling an already-cancelled booking', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const created = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  const id = created.body.data.reservation._id;
  await api(`/api/reservations/${id}/cancel`, { method: 'PATCH', token: userToken });
  const second = await api(`/api/reservations/${id}/cancel`, { method: 'PATCH', token: userToken });
  assert.equal(second.status, 409);
});

test('sweeper expires a no-show reservation and releases its slot', async () => {
  const { expireStaleReservations } = require('../utils/expireReservations');
  const Reservation = require('../models/Reservation');
  const { area, slot, userToken, vehicle } = await scenario();

  // Simulate a past-window ACTIVE reservation holding the slot (insert directly
  // because the API rejects past times).
  const start = new Date(Date.now() - 2 * 60 * 60000);
  const end = new Date(Date.now() - 60 * 60000);
  const reservation = await Reservation.create({ user: vehicle.owner, vehicle: vehicle._id, area: area._id, slot: slot._id, startTime: start, endTime: end, status: 'ACTIVE', pricePerHour: 20, estimatedCost: 20 });
  await ParkingSlot.updateOne({ _id: slot._id }, { status: 'RESERVED', currentReservation: reservation._id });

  const count = await expireStaleReservations(new Date());
  assert.ok(count >= 1);
  const after = await Reservation.findById(reservation._id);
  assert.equal(after.status, 'EXPIRED');
  const releasedSlot = await ParkingSlot.findById(slot._id);
  assert.equal(releasedSlot.status, 'AVAILABLE');
  void userToken;
});

test('records a snapshot price and estimated cost on booking', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const result = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.reservation.pricePerHour, 20);
  assert.ok(result.body.data.reservation.estimatedCost > 0);
});

test('extends a reservation to a later end time and recomputes cost', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const created = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  const id = created.body.data.reservation._id;
  const newEnd = new Date(Date.now() + 185 * 60000).toISOString();
  const extended = await api(`/api/reservations/${id}/extend`, { method: 'PATCH', token: userToken, body: { endTime: newEnd } });
  assert.equal(extended.status, 200);
  assert.equal(new Date(extended.body.data.reservation.endTime).toISOString(), newEnd);
  assert.ok(extended.body.data.reservation.estimatedCost >= created.body.data.reservation.estimatedCost);
});

test('rejects extending to an earlier end time', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const created = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  const earlier = new Date(Date.now() + 30 * 60000).toISOString();
  const result = await api(`/api/reservations/${created.body.data.reservation._id}/extend`, { method: 'PATCH', token: userToken, body: { endTime: earlier } });
  assert.equal(result.status, 400);
});

test('generates a receipt for a reservation', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const created = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  const receipt = await api(`/api/reservations/${created.body.data.reservation._id}/receipt`, { token: userToken });
  assert.equal(receipt.status, 200);
  assert.ok(receipt.body.data.receipt.receiptNumber.startsWith('PW'));
  assert.ok(receipt.body.data.receipt.total > 0);
  assert.ok(Array.isArray(receipt.body.data.receipt.lineItems));
});

test('returns an expense summary for the user', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  const created = await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  await api(`/api/reservations/${created.body.data.reservation._id}/check-in`, { method: 'POST', token: userToken });
  await api(`/api/reservations/${created.body.data.reservation._id}/check-out`, { method: 'POST', token: userToken });
  const expenses = await api('/api/reservations/expenses', { token: userToken });
  assert.equal(expenses.status, 200);
  assert.equal(expenses.body.data.summary.totalVisits, 1);
  assert.ok(expenses.body.data.summary.totalSpent > 0);
  assert.equal(expenses.body.data.byMonth.length, 6);
});

test('creates a booking notification the user can read', async () => {
  const { area, slot, userToken, vehicle } = await scenario();
  await api('/api/reservations', { method: 'POST', token: userToken, body: { vehicle: vehicle._id, area: area._id, slot: slot._id, ...times() } });
  const list = await api('/api/notifications', { token: userToken });
  assert.equal(list.status, 200);
  assert.ok(list.body.data.unreadCount >= 1);
  assert.ok(list.body.data.notifications.some((n) => n.type === 'BOOKING'));
});
