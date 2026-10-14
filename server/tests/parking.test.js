const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { api, clearDatabase, createUser, startTestServer, stopTestServer, token } = require('./helpers');

before(startTestServer);
after(stopTestServer);
beforeEach(clearDatabase);

async function adminToken() {
  const admin = await createUser({ email: 'admin@parkwise.test', role: 'admin' });
  return token(admin._id);
}

const areaBody = { name: 'Main Block', location: 'North', description: 'Primary', capacity: 5, allowedVehicleTypes: ['CAR'], status: 'OPEN' };

test('admin creates, updates, and deletes a parking area', async () => {
  const admin = await adminToken();
  const created = await api('/api/parking-areas', { method: 'POST', token: admin, body: areaBody });
  assert.equal(created.status, 201);
  const id = created.body.data.parkingArea._id;

  const updated = await api(`/api/parking-areas/${id}`, { method: 'PUT', token: admin, body: { ...areaBody, status: 'MAINTENANCE' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.parkingArea.status, 'MAINTENANCE');

  const deleted = await api(`/api/parking-areas/${id}`, { method: 'DELETE', token: admin });
  assert.equal(deleted.status, 200);
});

test('non-admin cannot create a parking area', async () => {
  const student = await createUser({ email: 'student@parkwise.test' });
  const result = await api('/api/parking-areas', { method: 'POST', token: token(student._id), body: areaBody });
  assert.equal(result.status, 403);
});

test('creates a slot and changes its status, enforcing uniqueness', async () => {
  const admin = await adminToken();
  const area = (await api('/api/parking-areas', { method: 'POST', token: admin, body: areaBody })).body.data.parkingArea;
  const slotBody = { area: area._id, slotNumber: 'A01', vehicleType: 'CAR', category: 'GENERAL', status: 'AVAILABLE' };

  const created = await api('/api/parking-slots', { method: 'POST', token: admin, body: slotBody });
  assert.equal(created.status, 201);
  const id = created.body.data.parkingSlot._id;

  const changed = await api(`/api/parking-slots/${id}`, { method: 'PUT', token: admin, body: { ...slotBody, status: 'MAINTENANCE' } });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.data.parkingSlot.status, 'MAINTENANCE');

  const duplicate = await api('/api/parking-slots', { method: 'POST', token: admin, body: slotBody });
  assert.equal(duplicate.status, 409);
});
