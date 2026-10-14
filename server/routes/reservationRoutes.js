const express = require('express');

const {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  createReservation,
  extendReservation,
  getExpenses,
  getReceipt,
  getReservation,
  listMyReservations,
  verifyReservation,
} = require('../controllers/reservationController');
const { protect, requireRole } = require('../middleware/auth');
const { validateReservationCreate, validateReservationId } = require('../middleware/validateReservation');

const router = express.Router();
router.use(protect);
router.post('/', validateReservationCreate, createReservation);
router.get('/my', listMyReservations);
router.get('/expenses', getExpenses);
router.get('/:id/verify', requireRole('security', 'admin'), validateReservationId, verifyReservation);
router.get('/:id/receipt', validateReservationId, getReceipt);
router.get('/:id', validateReservationId, getReservation);
router.patch('/:id/cancel', validateReservationId, cancelReservation);
router.patch('/:id/extend', validateReservationId, extendReservation);
router.post('/:id/check-in', validateReservationId, checkInReservation);
router.post('/:id/check-out', validateReservationId, checkOutReservation);

module.exports = router;
