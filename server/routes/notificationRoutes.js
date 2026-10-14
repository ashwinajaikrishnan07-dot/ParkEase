const express = require('express');

const { clearAll, listNotifications, markAllRead, markRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.delete('/', clearAll);
router.patch('/:id/read', markRead);

module.exports = router;
