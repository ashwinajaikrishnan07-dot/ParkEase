const express = require('express');

const { getProfile, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validateUser');

const router = express.Router();

router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);

module.exports = router;
