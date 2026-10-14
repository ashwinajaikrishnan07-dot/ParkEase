const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { api, clearDatabase, createUser, startTestServer, stopTestServer, token } = require('./helpers');
const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');

before(startTestServer);
after(stopTestServer);
beforeEach(clearDatabase);

async function scenario() {
  const reporter = await createUser({ email: 'reporter@parkwise.test' });
  const security = await createUser({ email: 'security@parkwise.test', role: 'security' });
  const area = await ParkingArea.create({ name: 'Area', location: 'North', capacity: 2, allowedVehicleTypes: ['CAR'], status: 'OPEN' });
  const slot = await ParkingSlot.create({ area: area._id, slotNumber: 'A01', vehicleType: 'CAR', category: 'GENERAL', status: 'OCCUPIED' });
  return { area, slot, reporterToken: token(reporter._id), securityToken: token(security._id) };
}

function reportBody(area, slot) {
  return { area: area._id, slot: slot._id, vehicleNumber: 'KL07AB9999', violationType: 'WRONG_SLOT', description: 'Vehicle parked in the wrong marked slot.' };
}

test('creates a report', async () => {
  const { area, slot, reporterToken } = await scenario();
  const result = await api('/api/reports', { method: 'POST', token: reporterToken, body: reportBody(area, slot) });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.report.status, 'PENDING');
});

test('reporter views only their own reports', async () => {
  const { area, slot, reporterToken } = await scenario();
  await api('/api/reports', { method: 'POST', token: reporterToken, body: reportBody(area, slot) });
  const result = await api('/api/reports/my', { token: reporterToken });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.reports.length, 1);
});

test('security updates report status', async () => {
  const { area, slot, reporterToken, securityToken } = await scenario();
  const created = await api('/api/reports', { method: 'POST', token: reporterToken, body: reportBody(area, slot) });
  const result = await api(`/api/reports/${created.body.data.report._id}/status`, { method: 'PATCH', token: securityToken, body: { status: 'RESOLVED' } });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.report.status, 'RESOLVED');
});

test('rejects unauthorized status changes', async () => {
  const { area, slot, reporterToken } = await scenario();
  const created = await api('/api/reports', { method: 'POST', token: reporterToken, body: reportBody(area, slot) });
  const result = await api(`/api/reports/${created.body.data.report._id}/status`, { method: 'PATCH', token: reporterToken, body: { status: 'RESOLVED' } });
  assert.equal(result.status, 403);
});
