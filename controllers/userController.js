const User = require('../models/User');
const WorkoutLog = require('../models/WorkoutLog');
const Event = require('../models/Event'); // We assume attendees contains User IDs

// @desc    Get user dashboard overview
// @route   GET /api/users/dashboard
const getDashboardOverview = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Get user profile
        const user = await User.findById(userId).select('-password');
        
        // 2. Get recent workouts (last 5)
        const recentWorkouts = await WorkoutLog.find({ userId })
            .sort({ date: -1 })
            .limit(5);
            
        // 3. Calculate weekly progress (e.g. total calories burned this week)
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday as start

        const weeklyWorkouts = await WorkoutLog.find({
            userId,
            date: { $gte: startOfWeek }
        });
        
        const weeklyCalories = weeklyWorkouts.reduce((acc, log) => acc + log.caloriesBurned, 0);
        const weeklyDuration = weeklyWorkouts.reduce((acc, log) => acc + log.duration, 0);

        // 4. Get upcoming events user is attending
        const upcomingEvents = await Event.find({
            attendees: userId,
            date: { $gte: new Date() }
        }).sort({ date: 1 }).limit(3);

        res.json({
            profile: user,
            recentWorkouts,
            weeklyStats: {
                caloriesBurned: weeklyCalories,
                durationMinutes: weeklyDuration,
                workoutsCount: weeklyWorkouts.length
            },
            upcomingEvents
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile by ID (public)
// @route   GET /api/users/profile/:id
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -healthProfile.caloriesIntake -healthProfile.caloriesLoss')
            .populate('followers', 'name avatar')
            .populate('following', 'name avatar');
            
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Also fetch recent posts or achievements if we want later
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update own user profile
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res) => {
    try {
        const { name, avatar, bio, interests } = req.body;
        const user = await User.findById(req.user.id);
        
        if (user) {
            user.name = name || user.name;
            if (avatar !== undefined) user.avatar = avatar;
            if (bio !== undefined) user.bio = bio;
            if (interests) user.interests = Array.isArray(interests) ? interests : interests.split(',').map(i=>i.trim());
            
            const updatedUser = await user.save();
            
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                avatar: updatedUser.avatar,
                bio: updatedUser.bio,
                interests: updatedUser.interests,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Follow a user
// @route   POST /api/users/:id/follow
const followUser = async (req, res) => {
    try {
        if (req.user.id === req.params.id) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }
        
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!userToFollow || !currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (currentUser.following.includes(req.params.id)) {
            return res.status(400).json({ message: 'You are already following this user' });
        }

        currentUser.following.push(req.params.id);
        userToFollow.followers.push(req.user.id);

        await currentUser.save();
        await userToFollow.save();

        res.json({ message: 'Successfully followed user' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Unfollow a user
// @route   POST /api/users/:id/unfollow
const unfollowUser = async (req, res) => {
    try {
        const userToUnfollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!userToUnfollow || !currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!currentUser.following.includes(req.params.id)) {
            return res.status(400).json({ message: 'You are not following this user' });
        }

        currentUser.following = currentUser.following.filter(
            id => id.toString() !== req.params.id
        );
        userToUnfollow.followers = userToUnfollow.followers.filter(
            id => id.toString() !== req.user.id
        );

        await currentUser.save();
        await userToUnfollow.save();

        res.json({ message: 'Successfully unfollowed user' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search for users
// @route   GET /api/users/search
const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        let dbQuery = { _id: { $ne: req.user.id } }; // Exclude self
        
        if (query) {
            dbQuery.name = { $regex: query, $options: 'i' };
        }
        
        const users = await User.find(dbQuery)
            .select('name avatar bio role')
            .limit(10);
            
        const currentUser = await User.findById(req.user.id);
        
        const usersWithStatus = users.map(u => ({
            ...u._doc,
            isFollowing: currentUser.following.includes(u._id)
        }));
            
        res.json(usersWithStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add an achievement
// @route   POST /api/users/achievements
const addAchievement = async (req, res) => {
    try {
        const { title, description, date } = req.body;
        const user = await User.findById(req.user.id);
        
        user.achievements.push({
            title,
            description,
            date: date || Date.now()
        });
        
        await user.save();
        res.status(201).json(user.achievements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get potential workout buddies (Matching Engine)
// @route   GET /api/users/buddies/potential
const getPotentialBuddies = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        
        // Basic match: active users not already matched, pending, or self
        const excludedIds = [
            currentUser._id,
            ...currentUser.matchedBuddies,
            ...currentUser.pendingBuddyRequests
        ];

        const query = {
            _id: { $nin: excludedIds }
        };

        // If user has a location set, prioritize same location
        let potentials = await User.find(query)
            .select('name avatar bio location preferredWorkoutTimes healthProfile interests fitnessGoals') // Added fitnessGoals
            .limit(20);

        // Simple scoring algorithm based on goals, location and workout times
        potentials = potentials.map(user => {
            let score = 0;
            // Location match
            if (currentUser.location && user.location && currentUser.location.toLowerCase() === user.location.toLowerCase()) score += 10;
            
            // Time match
            if (currentUser.preferredWorkoutTimes && user.preferredWorkoutTimes) {
                const commonTimes = currentUser.preferredWorkoutTimes.filter(t => user.preferredWorkoutTimes.includes(t));
                score += (commonTimes.length * 5); // 5 points per overlapping time
            }
            
            // Goal match (V3)
            if (currentUser.fitnessGoals && user.fitnessGoals) {
                const commonGoals = currentUser.fitnessGoals.filter(g => user.fitnessGoals.includes(g));
                score += (commonGoals.length * 8); // 8 points per overlapping goal
            }

            return { ...user.toObject(), matchScore: score };
        }).sort((a, b) => b.matchScore - a.matchScore);

        res.json(potentials);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send Buddy Request
// @route   POST /api/users/buddies/request/:id
const sendBuddyRequest = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        
        if (targetUserId === req.user.id) {
            return res.status(400).json({ message: "Cannot send request to yourself" });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        if (targetUser.pendingBuddyRequests.includes(req.user.id)) {
            return res.status(400).json({ message: "Request already sent" });
        }

        if (targetUser.matchedBuddies.includes(req.user.id)) {
            return res.status(400).json({ message: "Already buddies" });
        }

        targetUser.pendingBuddyRequests.push(req.user.id);
        await targetUser.save();

        res.json({ message: "Buddy request sent successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Accept Buddy Request
// @route   POST /api/users/buddies/accept/:id
const acceptBuddyRequest = async (req, res) => {
    try {
        const requesterId = req.params.id;
        const currentUser = await User.findById(req.user.id);
        const requesterUser = await User.findById(requesterId);

        if (!currentUser.pendingBuddyRequests.includes(requesterId)) {
            return res.status(400).json({ message: "No pending request from this user" });
        }

        // Remove from pending
        currentUser.pendingBuddyRequests = currentUser.pendingBuddyRequests.filter(id => id.toString() !== requesterId);
        
        // Add to matched mutual
        if (!currentUser.matchedBuddies.includes(requesterId)) currentUser.matchedBuddies.push(requesterId);
        if (!requesterUser.matchedBuddies.includes(req.user.id)) requesterUser.matchedBuddies.push(req.user.id);

        await currentUser.save();
        await requesterUser.save();

        res.json({ message: "Buddy request accepted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject Buddy Request
// @route   POST /api/users/buddies/reject/:id
const rejectBuddyRequest = async (req, res) => {
    try {
        const requesterId = req.params.id;
        const currentUser = await User.findById(req.user.id);

        currentUser.pendingBuddyRequests = currentUser.pendingBuddyRequests.filter(id => id.toString() !== requesterId);
        await currentUser.save();

        res.json({ message: "Buddy request rejected" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Pending Requests
// @route   GET /api/users/buddies/pending
const getPendingRequests = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id).populate('pendingBuddyRequests', 'name avatar bio location');
        res.json(currentUser.pendingBuddyRequests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- V3: Gamification ---

// @desc    Check-in at a location (Gym/Park)
// @route   POST /api/users/checkin
const registerCheckIn = async (req, res) => {
    try {
        const { location } = req.body;
        if (!location) return res.status(400).json({ message: 'Location is required' });

        const user = await User.findById(req.user.id);
        
        // Prevent spam check-ins (e.g., max 1 per day at same location)
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const alreadyCheckedIn = user.checkIns.some(c => 
            c.location.toLowerCase() === location.toLowerCase() && 
            new Date(c.date) >= today
        );

        if (alreadyCheckedIn) {
            return res.status(400).json({ message: 'Already checked in here today' });
        }

        user.checkIns.push({ location, date: new Date() });

        // Logic for "Mayorship" or badge awarding could go here.
        // e.g. if checkIns > 10 at "Gold's Gym" give "Gym Rat" badge
        const totalCheckinsHere = user.checkIns.filter(c => c.location.toLowerCase() === location.toLowerCase()).length;
        let newBadge = null;
        
        if (totalCheckinsHere === 10 && !user.badges.includes(`${location} Regular`)) {
            newBadge = `${location} Regular`;
            user.badges.push(newBadge);
        }

        await user.save();

        res.json({ message: 'Checked in successfully', checkIns: user.checkIns, newBadge });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Global User Leaderboard (by workouts completed)
// @route   GET /api/users/leaderboard
const getLeaderboard = async (req, res) => {
    try {
        const topUsers = await User.find({})
            .sort({ 'stats.workoutsCompleted': -1 })
            .limit(5)
            .select('name avatar stats.workoutsCompleted badges');
            
        res.json(topUsers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    getDashboardOverview, getUserProfile, updateUserProfile, followUser, unfollowUser, searchUsers, addAchievement,
    getPotentialBuddies, sendBuddyRequest, acceptBuddyRequest, rejectBuddyRequest, getPendingRequests,
    registerCheckIn, getLeaderboard
};
