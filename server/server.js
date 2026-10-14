require('dotenv').config();

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { validateJwtConfig } = require('./utils/jwt');
const { expireStaleReservations } = require('./utils/expireReservations');

const port = Number(process.env.PORT) || 5000;
const SWEEP_INTERVAL_MS = 60 * 1000;
let server;
let sweepTimer;
let isShuttingDown = false;

async function startServer() {
  try {
    validateJwtConfig();
    await connectDB();

    server = app.listen(port, () => {
      console.log(`ParkEase API listening on http://localhost:${port}`);
    });

    // Periodically release slots held by expired, no-show reservations.
    sweepTimer = setInterval(() => {
      expireStaleReservations().catch((error) => console.error('Reservation sweep failed:', error.message));
    }, SWEEP_INTERVAL_MS);
    sweepTimer.unref?.();
  } catch (error) {
    console.error(`Unable to start ParkEase API: ${error.message}`);
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down.`);
  if (sweepTimer) clearInterval(sweepTimer);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(`Graceful shutdown failed: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

startServer();
