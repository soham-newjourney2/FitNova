const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
    name: { type: String, required: true },
    goal: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Journey', journeySchema);
