const express = require('express');
const { joinWaitlist, leaveWaitlist, listMyWaitlist } = require('../controllers/waitlistController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/my', listMyWaitlist);
router.post('/', joinWaitlist);
router.delete('/:id', leaveWaitlist);

module.exports = router;
