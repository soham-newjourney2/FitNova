require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Challenge = require('./models/Challenge');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mockGamification = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fitnova');
        console.log('MongoDB connected. Mocking Gamification Data...');
        
        const users = await User.find().limit(5);
        if(users.length === 0) {
            console.log('No users found. Please register a user first.');
            process.exit();
        }

        const challenges = await Challenge.find();
        if(challenges.length === 0) {
            console.log('No challenges found.');
            process.exit();
        }

        // Add dummy checkins and badges to the first user
        const primaryUser = users[0];
        primaryUser.checkIns = [
            { location: 'Golds Gym', date: new Date() },
            { location: 'Central Park', date: new Date(Date.now() - 86400000) }
        ];
        primaryUser.badges = ['Early Bird', 'Consistency King'];
        
        // Mock workout stats for leaderboard
        if (!primaryUser.stats) primaryUser.stats = {};
        primaryUser.stats.workoutsCompleted = 45;
        await primaryUser.save();

        // Increment workout stats for others
        for (let i = 1; i < users.length; i++) {
            if (!users[i].stats) users[i].stats = {};
            users[i].stats.workoutsCompleted = Math.floor(Math.random() * 30);
            users[i].badges = ['Starter'];
            await users[i].save();
        }

        // Mock challenge participation for primary user
        const c1 = challenges[0];
        if(!c1.participants.find(p => p.user.toString() === primaryUser._id.toString())) {
            c1.participants.push({ user: primaryUser._id, progress: 50000, completed: false });
            await c1.save();
        }

        console.log('Gamification data mocked successfully for user:', primaryUser.email);
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

mockGamification();
