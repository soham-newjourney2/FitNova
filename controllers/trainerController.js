const TrainerProfile = require('../models/TrainerProfile');
const Booking = require('../models/Booking');

// @desc    Create or update trainer profile
// @route   POST /api/trainers/profile
const setupProfile = async (req, res) => {
    try {
        if (req.user.role !== 'trainer') {
            return res.status(403).json({ message: 'Only trainers can setup profiles' });
        }

        const { specialties, certifications } = req.body;

        let profile = await TrainerProfile.findOne({ userId: req.user.id });

        if (profile) {
            profile.specialties = specialties;
            profile.certifications = certifications;
        } else {
            profile = new TrainerProfile({
                userId: req.user.id,
                specialties,
                certifications,
                isVerified: true // Auto-verify for demo
            });
        }

        const saved = await profile.save();
        res.json(saved);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all trainers
// @route   GET /api/trainers
const getTrainers = async (req, res) => {
    try {
        const { search, specialty } = req.query;
        let query = {};

        if (specialty) {
            query.specialties = { $regex: specialty, $options: 'i' };
        }

        let trainers = await TrainerProfile.find(query)
            .populate('userId', 'name email healthProfile.workoutExperience avatar');

        if (search) {
            const regex = new RegExp(search, 'i');
            trainers = trainers.filter(t => 
                (t.userId && regex.test(t.userId.name)) || 
                t.specialties.some(s => regex.test(s))
            );
        }

        res.json(trainers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add open availability slot
// @route   POST /api/trainers/slots
const addSlot = async (req, res) => {
    try {
        if (req.user.role !== 'trainer') return res.status(403).json({ message: 'Not authorized' });

        const profile = await TrainerProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(404).json({ message: 'Trainer profile not found' });

        const slotDate = new Date(req.body.timeSlot);
        if (isNaN(slotDate.getTime())) return res.status(400).json({ message: 'Invalid datetime' });

        // Prevent duplicates
        if (!profile.availableSlots.some(d => d.getTime() === slotDate.getTime())) {
            profile.availableSlots.push(slotDate);
            // Optional sorting
            profile.availableSlots.sort((a,b) => a - b);
            await profile.save();
        }

        res.json({ message: 'Slot added', availableSlots: profile.availableSlots });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Book a session with a trainer
// @route   POST /api/trainers/book
const bookSession = async (req, res) => {
    try {
        const { trainerId, timeSlot } = req.body;
        
        // Prevent booking if not user or booking self
        if (trainerId === req.user.id) {
            return res.status(400).json({ message: 'Cannot book yourself' });
        }

        const requestedDate = new Date(timeSlot);

        // Verify trainer exists and has this slot available
        const profile = await TrainerProfile.findOne({ userId: trainerId });
        if (!profile) return res.status(404).json({ message: 'Trainer not found' });

        const slotIndex = profile.availableSlots.findIndex(d => d.getTime() === requestedDate.getTime());
        if (slotIndex === -1) {
            return res.status(400).json({ message: 'This time slot is no longer available.' });
        }

        const booking = new Booking({
            trainerId,
            userId: req.user.id,
            timeSlot: requestedDate
        });

        const saved = await booking.save();

        // Remove the slot from availability
        profile.availableSlots.splice(slotIndex, 1);
        await profile.save();

        res.status(201).json({ message: 'Session booked', booking: saved });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify a trainer (Admin only)
// @route   POST /api/trainers/:id/verify
const verifyTrainer = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can verify trainers' });
        }
        
        const profile = await TrainerProfile.findOne({ userId: req.params.id });
        if (!profile) return res.status(404).json({ message: 'Trainer profile not found' });
        
        profile.isVerified = true;
        await profile.save();
        res.json({ message: 'Trainer verified successfully', profile });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get trainer's bookings
// @route   GET /api/trainers/bookings
const getBookings = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'trainer') {
            query.trainerId = req.user.id;
        } else {
            query.userId = req.user.id;
        }

        const bookings = await Booking.find(query)
            .populate('trainerId', 'name avatar')
            .populate('userId', 'name avatar')
            .sort({ timeSlot: 1 });
            
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a booking status/link
// @route   PUT /api/trainers/bookings/:id
const updateBooking = async (req, res) => {
    try {
        const { status, meetingLink } = req.body;
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        
        // Only trainer can confirm/cancel and add link. Users can only cancel.
        if (req.user.role === 'trainer' && booking.trainerId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        if (status) booking.status = status;
        if (meetingLink !== undefined) booking.meetingLink = meetingLink;
        
        const updated = await booking.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    setupProfile,
    getTrainers,
    addSlot,
    bookSession,
    verifyTrainer,
    getBookings,
    updateBooking
};
