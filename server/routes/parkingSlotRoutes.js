const express = require('express');

const {
  createParkingSlot,
  deleteParkingSlot,
  getParkingSlot,
  listParkingSlots,
  updateParkingSlot,
} = require('../controllers/parkingSlotController');
const { protect, requireRole } = require('../middleware/auth');
const {
  validateParkingSlot,
  validateParkingSlotId,
  validateSlotFilters,
} = require('../middleware/validateParkingSlot');

const router = express.Router();

router.use(protect);
router.route('/').get(validateSlotFilters, listParkingSlots).post(requireRole('admin'), validateParkingSlot, createParkingSlot);
router
  .route('/:id')
  .all(validateParkingSlotId)
  .get(getParkingSlot)
  .put(requireRole('admin'), validateParkingSlot, updateParkingSlot)
  .delete(requireRole('admin'), deleteParkingSlot);

module.exports = router;
