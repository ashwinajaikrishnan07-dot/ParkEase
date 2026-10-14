const mongoose = require('mongoose');
const ParkingArea = require('../models/ParkingArea');
const ParkingReport = require('../models/ParkingReport');
const ParkingSlot = require('../models/ParkingSlot');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { ALLOWED_ROLES } = require('../models/User');
const AppError = require('../utils/AppError');
const { enrichWithAvailability } = require('../utils/areaAvailability');

const reservationPopulation = [
  { path: 'user', select: 'name email role' },
  { path: 'vehicle', select: 'registrationNumber type' },
  { path: 'area', select: 'name location' },
  { path: 'slot', select: 'slotNumber' },
];

async function listUsers(request, response) {
  const filter = {};
  if (request.query.role && ALLOWED_ROLES.includes(request.query.role.toLowerCase())) {
    filter.role = request.query.role.toLowerCase();
  }
  const users = await User.find(filter).sort({ createdAt: -1 });
  response.status(200).json({ success: true, message: 'Users retrieved', data: { users } });
}

async function updateUserRole(request, response) {
  if (!mongoose.isObjectIdOrHexString(request.params.id)) throw new AppError('Invalid user id', 400);
  const role = typeof request.body.role === 'string' ? request.body.role.trim().toLowerCase() : '';
  if (!ALLOWED_ROLES.includes(role)) {
    throw new AppError('Invalid role', 400, { role: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` });
  }

  if (request.params.id === request.user._id.toString() && role !== 'admin') {
    throw new AppError('You cannot remove your own admin role', 409);
  }

  const user = await User.findById(request.params.id);
  if (!user) throw new AppError('User not found', 404);
  user.role = role;
  await user.save();

  response.status(200).json({ success: true, message: 'User role updated', data: { user: user.toJSON() } });
}

async function listReservations(request, response) {
  const filter = {};
  if (request.query.status) filter.status = request.query.status.toUpperCase();
  const reservations = await Reservation.find(filter).sort({ createdAt: -1 }).limit(200).populate(reservationPopulation);
  response.status(200).json({ success: true, message: 'Reservations retrieved', data: { reservations } });
}

async function getDashboardStats(_request, response) {
  const [slotCounts, reservationCounts, reportCounts, userCount, areaCount] = await Promise.all([
    ParkingSlot.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Reservation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ParkingReport.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments(),
    ParkingArea.countDocuments(),
  ]);

  const slotByStatus = Object.fromEntries(slotCounts.map((item) => [item._id, item.count]));
  const reservationByStatus = Object.fromEntries(reservationCounts.map((item) => [item._id, item.count]));
  const reportByStatus = Object.fromEntries(reportCounts.map((item) => [item._id, item.count]));
  const totalSlots = slotCounts.reduce((sum, item) => sum + item.count, 0);
  const occupiedSlots = slotByStatus.OCCUPIED || 0;
  const maintenanceSlots = slotByStatus.MAINTENANCE || 0;
  const usableSlots = totalSlots - maintenanceSlots;
  const occupancyPercentage = usableSlots > 0 ? Math.round((occupiedSlots / usableSlots) * 10000) / 100 : 0;

  response.status(200).json({
    success: true,
    message: 'Dashboard statistics retrieved',
    data: {
      stats: {
        totalUsers: userCount,
        totalAreas: areaCount,
        totalSlots,
        availableSlots: slotByStatus.AVAILABLE || 0,
        occupiedSlots,
        reservedSlots: slotByStatus.RESERVED || 0,
        maintenanceSlots,
        occupancyPercentage,
        activeReservations: (reservationByStatus.ACTIVE || 0) + (reservationByStatus.CHECKED_IN || 0),
        pendingReports: (reportByStatus.PENDING || 0) + (reportByStatus.UNDER_REVIEW || 0),
        reservationsByStatus: reservationByStatus,
        reportsByStatus: reportByStatus,
      },
    },
  });
}

async function getHeatmap(_request, response) {
  const areas = await ParkingArea.find().sort({ name: 1 }).populate({ path: 'destination', select: 'name' });
  const enriched = await enrichWithAvailability(areas);
  const heatmap = enriched.map((area) => ({
    _id: area._id,
    name: area.name,
    destination: area.destination?.name || null,
    status: area.status,
    congestionLevel: area.availability.congestionLevel,
    occupancyPercentage: area.availability.occupancyPercentage,
    availableSlots: area.availability.availableSlots,
    totalSlots: area.availability.totalSlots,
  }));
  response.status(200).json({ success: true, message: 'Occupancy heatmap retrieved', data: { heatmap } });
}

module.exports = { getDashboardStats, getHeatmap, listReservations, listUsers, updateUserRole };
