const express = require('express');

const {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} = require('../controllers/vehicleController');
const { protect } = require('../middleware/auth');
const { validateVehicle, validateVehicleId } = require('../middleware/validateVehicle');

const router = express.Router();

router.use(protect);
router.route('/').get(listVehicles).post(validateVehicle, createVehicle);
router
  .route('/:id')
  .all(validateVehicleId)
  .get(getVehicle)
  .put(validateVehicle, updateVehicle)
  .delete(deleteVehicle);

module.exports = router;
