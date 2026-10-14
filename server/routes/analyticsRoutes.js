const express = require('express');
const { getDashboard, getOccupancy, getPeakHours } = require('../controllers/analyticsController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect, requireRole('admin'));
router.get('/dashboard', getDashboard);
router.get('/occupancy', getOccupancy);
router.get('/peak-hours', getPeakHours);

module.exports = router;
