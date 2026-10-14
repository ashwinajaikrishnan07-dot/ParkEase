const express = require('express');
const { createReport, getReport, listMyReports, listReports, updateReportStatus } = require('../controllers/parkingReportController');
const { protect, requireRole } = require('../middleware/auth');
const { validateReportCreate, validateReportFilters, validateReportId, validateReportStatus } = require('../middleware/validateParkingReport');

const router = express.Router();
router.use(protect);
router.post('/', validateReportCreate, createReport);
router.get('/my', listMyReports);
router.get('/', requireRole('security', 'admin'), validateReportFilters, listReports);
router.get('/:id', validateReportId, getReport);
router.patch('/:id/status', requireRole('security', 'admin'), validateReportId, validateReportStatus, updateReportStatus);

module.exports = router;
