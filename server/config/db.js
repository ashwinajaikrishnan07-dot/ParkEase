const mongoose = require('mongoose');

const CONNECTION_TIMEOUT_MS = 5000;

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured');
  }

  const connection = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
  });

  console.log(`MongoDB connected: ${connection.connection.name}`);
  return connection;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

module.exports = { connectDB, disconnectDB };
