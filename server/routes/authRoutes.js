const express = require('express');

const { getAuthConfig, getCurrentUser, googleSignIn, login, register } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { validateLogin, validateRegister } = require('../middleware/validateAuth');

const router = express.Router();
const authLimiter = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

router.get('/config', getAuthConfig);
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/google', authLimiter, googleSignIn);
router.get('/me', protect, getCurrentUser);

module.exports = router;
