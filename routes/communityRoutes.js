const express = require('express');
const router = express.Router();
const { createGroup, getGroups, joinGroup, addModerator, createPost, getPosts, getPostById, likePost, addComment, pinPost, deletePost, createJourney, getJourneys } = require('../controllers/communityController');
const { protect } = require('../middleware/authMiddleware');

router.route('/groups').get(protect, getGroups).post(protect, createGroup);
router.post('/groups/:id/join', protect, joinGroup);
router.post('/groups/:id/moderator', protect, addModerator);
router.route('/posts').get(protect, getPosts).post(protect, createPost);
router.get('/posts/:id', protect, getPostById);
router.post('/posts/:id/like', protect, likePost);
router.post('/posts/:id/comment', protect, addComment);
router.post('/posts/:id/pin', protect, pinPost);
router.delete('/posts/:id', protect, deletePost);

// V3 Journeys
router.route('/journeys').get(protect, getJourneys).post(protect, createJourney);

module.exports = router;
