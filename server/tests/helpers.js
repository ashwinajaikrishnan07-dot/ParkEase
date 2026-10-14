process.env.JWT_SECRET = process.env.JWT_SECRET || 'parkwise_test_secret_value_at_least_32_chars_long';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/parkwise_test';

const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');

let server;
let baseUrl;

async function startTestServer() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  }
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

async function stopTestServer() {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

async function clearDatabase() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

async function api(path, { body, method = 'GET', token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, body: payload };
}

async function createUser({ email, role = 'student', name = 'Test User', phone = '9876543210' }) {
  return User.create({ name, email, password: 'ValidPass123', phone, role });
}

function token(userId) {
  return require('../utils/jwt').generateToken(userId);
}

module.exports = { api, clearDatabase, createUser, startTestServer, stopTestServer, token };
