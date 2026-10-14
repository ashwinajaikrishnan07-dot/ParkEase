const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');

const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/authRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const eventRoutes = require('./routes/eventRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const trafficRoutes = require('./routes/trafficRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const parkingAreaRoutes = require('./routes/parkingAreaRoutes');
const parkingReportRoutes = require('./routes/parkingReportRoutes');
const parkingSlotRoutes = require('./routes/parkingSlotRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const userRoutes = require('./routes/userRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const { errorHandler, notFound } = require('./middleware/error');
const { securityHeaders } = require('./middleware/securityHeaders');

const app = express();
const databaseStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_request, response) => {
  const databaseStatus = databaseStates[mongoose.connection.readyState] || 'unknown';
  const isReady = databaseStatus === 'connected';
  response.status(isReady ? 200 : 503).json({ success: isReady, message: isReady ? 'ParkEase API is ready' : 'ParkEase API is not ready', data: { phase: 18, database: databaseStatus } });
});

app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parking-areas', parkingAreaRoutes);
app.use('/api/parking-slots', parkingSlotRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reports', parkingReportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
