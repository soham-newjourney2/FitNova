const express = require('express');
const router = express.Router();
const { 
    getDashboardOverview, getUserProfile, updateUserProfile, followUser, unfollowUser, searchUsers, addAchievement,
    getPotentialBuddies, sendBuddyRequest, acceptBuddyRequest, rejectBuddyRequest, getPendingRequests
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardOverview);
router.route('/profile').put(protect, updateUserProfile);
router.route('/search').get(protect, searchUsers);
router.route('/achievements').post(protect, addAchievement);
router.route('/profile/:id').get(protect, getUserProfile);

router.route('/:id/follow').post(protect, followUser);
router.route('/:id/unfollow').post(protect, unfollowUser);

// Buddy System Routes
router.route('/buddies/potential').get(protect, getPotentialBuddies);
router.route('/buddies/pending').get(protect, getPendingRequests);
router.route('/buddies/request/:id').post(protect, sendBuddyRequest);
router.route('/buddies/accept/:id').post(protect, acceptBuddyRequest);
router.route('/buddies/reject/:id').post(protect, rejectBuddyRequest);

// V3: Gamification Check-ins & Leaderboard
const { registerCheckIn, getLeaderboard } = require('../controllers/userController');
router.post('/checkin', protect, registerCheckIn);
router.get('/leaderboard', protect, getLeaderboard);

module.exports = router;
