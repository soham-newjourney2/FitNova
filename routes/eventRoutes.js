const express = require('express');
const router = express.Router();
const { getEvents, createEvent, registerEvent, getEventParticipants, addEventComment, getEventComments } = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getEvents).post(protect, createEvent);
router.post('/:id/register', protect, registerEvent);
router.get('/:id/participants', protect, getEventParticipants);
router.route('/:id/comments')
    .get(protect, getEventComments)
    .post(protect, addEventComment);

// V3: Carpool & Completion
const { offerCarpool, joinCarpool, completeEvent } = require('../controllers/eventController');

router.post('/:id/carpool', protect, offerCarpool);
router.post('/:id/carpool/:carpoolId/join', protect, joinCarpool);
router.post('/:id/complete', protect, completeEvent);

module.exports = router;
