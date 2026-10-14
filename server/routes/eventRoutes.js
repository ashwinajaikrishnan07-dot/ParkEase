const express = require('express');
const { createEvent, deleteEvent, listEvents } = require('../controllers/eventController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', listEvents);
router.post('/', requireRole('admin'), createEvent);
router.delete('/:id', requireRole('admin'), deleteEvent);

module.exports = router;
