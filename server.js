require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dns = require('dns');

// Force Google DNS to bypass local ISP SRV blocks
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fitnova');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/workouts', require('./routes/trackingRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/trainers', require('./routes/trainerRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/challenges', require('./routes/challengeRoutes')); // V3: Gamification

app.get('/api/health', (req, res) => {
    res.json({ status: 'API is running' });
});

// Start Server
app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running on http://localhost:${PORT}`);
});
