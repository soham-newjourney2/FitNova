const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'trainer', 'admin'], default: 'user' },
    healthProfile: {
        age: { type: Number }, // ADDED
        gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] }, // ADDED
        medicalConditions: { type: String }, // ADDED - Optional text input
        height: { type: Number }, // in cm
        weight: { type: Number }, // in kg
        bmi: { type: Number },
        caloriesIntake: { type: Number },
        caloriesLoss: { type: Number },
        workoutExperience: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
    },
    // V2 Enhancements
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    interests: [{ type: String }],
    fitnessGoals: [{ type: String }], // Added for V3 Matching
    achievements: [{ title: String, date: { type: Date, default: Date.now }, description: String }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Phase 1: Buddy Matching
    location: { type: String, default: '' }, // e.g., 'City, State' or 'Neighborhood'
    preferredWorkoutTimes: [{ type: String, enum: ['Morning', 'Afternoon', 'Evening', 'Late Night'] }],
    matchedBuddies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingBuddyRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // V3: Gamification
    checkIns: [{
        location: String,
        date: { type: Date, default: Date.now }
    }],
    badges: [{ type: String }], // e.g. ["Marathon Finisher", "Iron Lifter"]
    streak: { type: Number, default: 0 }, // V3 Streak System
    lastPostDate: { type: Date },

    createdAt: { type: Date, default: Date.now }
});

// Calculate BMI before saving
userSchema.pre('save', async function() {
    // Only hash password if it's modified
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    
    // Auto-calculate BMI
    if (this.isModified('healthProfile.height') || this.isModified('healthProfile.weight')) {
        const h = this.healthProfile.height;
        const w = this.healthProfile.weight;
        if (h && w && h > 0) {
            const heightInMeters = h / 100;
            const bmi = w / (heightInMeters * heightInMeters);
            this.healthProfile.bmi = parseFloat(bmi.toFixed(2));
        }
    }
});

// Match password method
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
