const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { api, clearDatabase, createUser, startTestServer, stopTestServer, token } = require('./helpers');

before(startTestServer);
after(stopTestServer);
beforeEach(clearDatabase);

const account = { name: 'Auth User', email: 'auth@parkwise.test', password: 'ValidPass123', phone: '9876543210', role: 'student' };

test('registers a new user and returns a token with the safe default role', async () => {
  const result = await api('/api/auth/register', { method: 'POST', body: account });
  assert.equal(result.status, 201);
  assert.ok(result.body.data.token);
  assert.equal(result.body.data.user.password, undefined);
  assert.equal(result.body.data.user.role, 'user');
});

test('logs in with valid credentials', async () => {
  await api('/api/auth/register', { method: 'POST', body: account });
  const result = await api('/api/auth/login', { method: 'POST', body: { email: account.email, password: account.password } });
  assert.equal(result.status, 200);
  assert.ok(result.body.data.token);
});

test('rejects an invalid password', async () => {
  await api('/api/auth/register', { method: 'POST', body: account });
  const result = await api('/api/auth/login', { method: 'POST', body: { email: account.email, password: 'WrongPass999' } });
  assert.equal(result.status, 401);
});

test('rejects a duplicate email', async () => {
  await api('/api/auth/register', { method: 'POST', body: account });
  const result = await api('/api/auth/register', { method: 'POST', body: account });
  assert.equal(result.status, 409);
});

test('ignores a client-supplied role and never self-promotes to admin', async () => {
  const result = await api('/api/auth/register', { method: 'POST', body: { ...account, role: 'admin' } });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.user.role, 'user');
});

test('blocks non-admin from admin stats', async () => {
  const student = await createUser({ email: 'student@parkwise.test' });
  const result = await api('/api/admin/stats', { token: token(student._id) });
  assert.equal(result.status, 403);
});

test('exposes auth config with google disabled when unconfigured', async () => {
  const result = await api('/api/auth/config');
  assert.equal(result.status, 200);
  assert.equal(result.body.data.googleEnabled, false);
});

test('google sign-in returns 503 when not configured', async () => {
  const result = await api('/api/auth/google', { method: 'POST', body: { credential: 'dummy' } });
  assert.equal(result.status, 503);
});
