const mongoose = require('mongoose');

// V3 Feature: Gamification Challenges
const challengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['steps', 'workouts', 'weight', 'checkin'], required: true },
    target: { type: Number, required: true }, // e.g. 100000 steps, or 20 workouts
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    badgeReward: { type: String, required: true }, // Name of the badge given on completion
    participants: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        progress: { type: Number, default: 0 },
        completed: { type: Boolean, default: false }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Challenge', challengeSchema);
