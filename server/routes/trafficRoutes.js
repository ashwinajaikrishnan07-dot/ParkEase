const express = require('express');

const { createTrafficReport, listTrafficReports } = require('../controllers/trafficController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', listTrafficReports);
router.post('/', createTrafficReport);

module.exports = router;
