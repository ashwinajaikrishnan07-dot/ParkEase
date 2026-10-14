const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { api, clearDatabase, createUser, startTestServer, stopTestServer, token } = require('./helpers');
const Destination = require('../models/Destination');

before(startTestServer);
after(stopTestServer);
beforeEach(clearDatabase);

async function scenario() {
  const user = await createUser({ email: 'driver@parkwise.test' });
  const destination = await Destination.create({ name: 'Brookefields Mall', category: 'MALL', city: 'Coimbatore', latitude: 11.0028, longitude: 76.9668 });
  return { destination, userToken: token(user._id) };
}

test('submits a traffic report and lists it back with a summary', async () => {
  const { destination, userToken } = await scenario();
  const created = await api('/api/traffic', { method: 'POST', token: userToken, body: { destination: destination._id, level: 'HEAVY', comment: 'Jam near the signal' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.report.level, 'HEAVY');

  const list = await api(`/api/traffic?destination=${destination._id}`, { token: userToken });
  assert.equal(list.status, 200);
  assert.equal(list.body.data.reports.length, 1);
  assert.equal(list.body.data.summary.level, 'HEAVY');
  assert.equal(list.body.data.summary.total, 1);
});

test('rejects a traffic report with an invalid level', async () => {
  const { destination, userToken } = await scenario();
  const result = await api('/api/traffic', { method: 'POST', token: userToken, body: { destination: destination._id, level: 'NOPE' } });
  assert.equal(result.status, 400);
});

test('requires a destination id when listing traffic reports', async () => {
  const { userToken } = await scenario();
  const result = await api('/api/traffic', { token: userToken });
  assert.equal(result.status, 400);
});
