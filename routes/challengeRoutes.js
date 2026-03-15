const express = require('express');
const router = express.Router();
const { getChallenges, joinChallenge, createChallenge } = require('../controllers/challengeController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getChallenges)
    .post(protect, createChallenge);

router.post('/:id/join', protect, joinChallenge);

module.exports = router;
