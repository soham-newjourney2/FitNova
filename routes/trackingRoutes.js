const express = require('express');
const router = express.Router();
const { logWorkout, getProgress } = require('../controllers/trackingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/log', protect, logWorkout);
router.get('/progress', protect, getProgress);

module.exports = router;
