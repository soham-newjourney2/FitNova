const express = require('express');
const router = express.Router();
const { registerUser, loginUser, completeOnboarding, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/onboarding', protect, completeOnboarding);
router.post('/reset-password', resetPassword);

module.exports = router;
