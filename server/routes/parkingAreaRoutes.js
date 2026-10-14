const express = require('express');

const {
  createParkingArea,
  deleteParkingArea,
  getAlternatives,
  getParkingArea,
  listParkingAreas,
  updateParkingArea,
} = require('../controllers/parkingAreaController');
const { protect, requireRole } = require('../middleware/auth');
const { validateParkingArea, validateParkingAreaId } = require('../middleware/validateParkingArea');

const router = express.Router();

router.use(protect);
router.route('/').get(listParkingAreas).post(requireRole('admin'), validateParkingArea, createParkingArea);
router.get('/:id/alternatives', validateParkingAreaId, getAlternatives);
router
  .route('/:id')
  .all(validateParkingAreaId)
  .get(getParkingArea)
  .put(requireRole('admin'), validateParkingArea, updateParkingArea)
  .delete(requireRole('admin'), deleteParkingArea);

module.exports = router;
