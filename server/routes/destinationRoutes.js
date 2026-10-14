const express = require('express');
const { getDestination, getDestinationInsights, getDestinationParking, listDestinations } = require('../controllers/destinationController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', listDestinations);
router.get('/:id', getDestination);
router.get('/:id/parking', getDestinationParking);
router.get('/:id/insights', getDestinationInsights);

module.exports = router;
