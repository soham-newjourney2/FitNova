const WorkoutLog = require('../models/WorkoutLog');

// @desc    Log a new workout
// @route   POST /api/workouts/log
const logWorkout = async (req, res) => {
    try {
        const { exerciseType, duration, caloriesBurned, notes, date } = req.body;
        
        const workout = new WorkoutLog({
            userId: req.user.id,
            exerciseType,
            duration,
            caloriesBurned,
            notes,
            date: date || Date.now()
        });

        const savedLog = await workout.save();
        res.status(201).json(savedLog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get complete workout history or filtered progress
// @route   GET /api/workouts/progress
const getProgress = async (req, res) => {
    try {
        // can extract ?days=30 from query
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const logs = await WorkoutLog.find({
            userId: req.user.id,
            date: { $gte: sinceDate }
        }).sort({ date: 1 }); // chronological

        // Generate Daily Summary for Charts
        const totals = {
            duration: 0,
            calories: 0,
            workouts: logs.length
        };

        logs.forEach(log => {
            totals.duration += log.duration;
            totals.calories += log.caloriesBurned;
        });

        res.json({
            summary: totals,
            history: logs
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { logWorkout, getProgress };
