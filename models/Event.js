const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    coordinates: { 
        lat: { type: Number },
        lng: { type: Number }
    },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxAttendees: { type: Number },
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    carpools: [{
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        passengers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        availableSeats: { type: Number, required: true },
        departureTime: { type: String, required: true },
        location: { type: String, required: true }
    }], // V3 Carpooling
    isCompleted: { type: Boolean, default: false }, // V3 Post-Event
    leaderboard: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        time: { type: String, required: true } // e.g. "01:45:00" for a marathon
    }], // V3 Leaderboard
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
