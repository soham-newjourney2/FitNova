const mongoose = require('mongoose');

const workoutLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    exerciseType: { type: String, required: true },
    duration: { type: Number, required: true }, // in minutes
    caloriesBurned: { type: Number, required: true },
    notes: { type: String },
    journey: { type: mongoose.Schema.Types.ObjectId, ref: 'Journey' }, // V3 Journey
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);
