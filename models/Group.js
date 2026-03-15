const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    rules: { type: String, default: 'Be respectful to everyone. No spam.' },
    isSquad: { type: Boolean, default: false }, // V3 Squads
    streak: { type: Number, default: 0 },       // V3 Squad streak
    lastActivityDate: { type: Date },           // V3 For streak tracking
    isBootcamp: { type: Boolean, default: false }, // V3 Bootcamp
    price: { type: Number, default: 0 },         // V3 Bootcamp Price
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', groupSchema);
