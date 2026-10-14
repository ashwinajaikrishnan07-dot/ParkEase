const express = require('express');
const { getDashboardStats, getHeatmap, listReservations, listUsers, updateUserRole } = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect, requireRole('admin'));
router.get('/stats', getDashboardStats);
router.get('/heatmap', getHeatmap);
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/reservations', listReservations);

module.exports = router;
