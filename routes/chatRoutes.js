const express = require('express');
const router = express.Router();
const { getRooms, getOrCreateDirectRoom, getMessages, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.route('/rooms').get(protect, getRooms);
router.route('/rooms/direct/:userId').post(protect, getOrCreateDirectRoom);
router.route('/rooms/:roomId/messages')
    .get(protect, getMessages)
    .post(protect, sendMessage);

module.exports = router;
