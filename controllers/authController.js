const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'supersecretfitnovakey2026', {
        expiresIn: '30d'
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name, email, password, role
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                healthProfile: user.healthProfile,
                token: generateToken(user._id, user.role)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Onboarding data (height, weight, exp, etc)
// @route   POST /api/auth/onboarding
const completeOnboarding = async (req, res) => {
    try {
        const { age, gender, medicalConditions, height, weight, caloriesIntake, caloriesLoss, workoutExperience } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.healthProfile = {
            age,
            gender,
            medicalConditions,
            height,
            weight,
            caloriesIntake,
            caloriesLoss,
            workoutExperience
        };

        const updatedUser = await user.save(); // BMI is calculated here by pre-save hook

        res.json({
            _id: updatedUser._id,
            healthProfile: updatedUser.healthProfile
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Password Reset
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.password = newPassword;
        await user.save(); // pre-save will hash
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    completeOnboarding,
    resetPassword
};
