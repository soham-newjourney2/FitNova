const express = require('express');
const router = express.Router();
const { setupProfile, getTrainers, addSlot, bookSession, verifyTrainer, getBookings, updateBooking } = require('../controllers/trainerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/profile', protect, setupProfile);
router.get('/', protect, getTrainers);
router.post('/book', protect, bookSession);

// V3 New Routes
router.post('/:id/verify', protect, verifyTrainer);
router.post('/slots', protect, addSlot);
router.get('/bookings', protect, getBookings);
router.put('/bookings/:id', protect, updateBooking);

module.exports = router;
