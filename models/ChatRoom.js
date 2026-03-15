const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    groupRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // For community group chats
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
