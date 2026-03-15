const mongoose = require('mongoose');

const trainerProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialties: [{ type: String }],
    certifications: [{ type: String }],
    availableSlots: [{ type: Date }],
    isVerified: { type: Boolean, default: false }, // V3 Verification
    rating: { type: Number, default: 0 },
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, required: true },
        comment: { type: String },
        date: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TrainerProfile', trainerProfileSchema);
