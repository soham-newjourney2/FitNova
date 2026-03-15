const User = require('../models/User');
const Event = require('../models/Event');
const Group = require('../models/Group');
const WorkoutLog = require('../models/WorkoutLog');

// @desc    Get system wide statistics
// @route   GET /api/admin/system-stats
const getSystemStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const trainersCount = await User.countDocuments({ role: 'trainer' });
        const totalEvents = await Event.countDocuments();
        const totalGroups = await Group.countDocuments();
        const totalWorkouts = await WorkoutLog.countDocuments();

        res.json({
            users: totalUsers,
            trainers: trainersCount,
            events: totalEvents,
            groups: totalGroups,
            workouts: totalWorkouts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if(!user) return res.status(404).json({ message: 'User not found' });
        
        await user.deleteOne();
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSystemStats, getAllUsers, deleteUser };
