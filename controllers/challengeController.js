const Challenge = require('../models/Challenge');

// @desc    Get all active challenges
// @route   GET /api/challenges
const getChallenges = async (req, res) => {
    try {
        const currentDate = new Date();
        const challenges = await Challenge.find({
            endDate: { $gte: currentDate }
        });
        
        // Add user progress to each challenge if participating
        const enrichedChallenges = challenges.map(c => {
            const obj = c.toObject();
            const participation = obj.participants.find(p => p.user.toString() === req.user.id);
            obj.myProgress = participation ? participation.progress : null;
            obj.isParticipating = !!participation;
            obj.isCompleted = participation ? participation.completed : false;
            // Don't send whole participant list to normal users
            delete obj.participants; 
            return obj;
        });

        res.json(enrichedChallenges);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Join a challenge
// @route   POST /api/challenges/:id/join
const joinChallenge = async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

        const isParticipating = challenge.participants.some(p => p.user.toString() === req.user.id);
        if (isParticipating) {
            return res.status(400).json({ message: 'Already participating in this challenge' });
        }

        challenge.participants.push({ user: req.user.id, progress: 0 });
        await challenge.save();

        res.status(200).json({ message: 'Successfully joined the challenge' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a challenge (Admin only)
// @route   POST /api/challenges
const createChallenge = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can create challenges' });
        }

        const { title, description, type, target, startDate, endDate, badgeReward } = req.body;

        const challenge = await Challenge.create({
            title, description, type, target, startDate, endDate, badgeReward
        });

        res.status(201).json(challenge);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getChallenges, joinChallenge, createChallenge };
