require('dotenv').config();
const mongoose = require('mongoose');
const Challenge = require('./models/Challenge');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const challenges = [
    {
        title: '100k Steps May',
        description: 'Walk 100,000 steps by the end of May.',
        type: 'steps',
        target: 100000,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 month from now
        badgeReward: 'Step Master'
    },
    {
        title: 'Gym Rat Essentials',
        description: 'Check in at any gym location 15 times this month.',
        type: 'checkin',
        target: 15,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        badgeReward: 'Gym Rat'
    },
    {
        title: 'Summer Shred',
        description: 'Complete 20 workout sessions before summer begins.',
        type: 'workouts',
        target: 20,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)), // 2 months from now
        badgeReward: 'Shredded'
    }
];

const seedChallenges = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fitnova');
        console.log('MongoDB connected for seeding challenges...');
        
        await Challenge.deleteMany({}); // clear old
        await Challenge.insertMany(challenges);
        
        console.log('Challenges seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedChallenges();
