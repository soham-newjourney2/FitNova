const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // ADDED
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // optional, if posted in a group
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    journey: { type: mongoose.Schema.Types.ObjectId, ref: 'Journey' }, // V3 Journey
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
