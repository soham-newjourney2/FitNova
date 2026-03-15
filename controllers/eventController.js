const Event = require('../models/Event');
const Notification = require('../models/Notification');

const User = require('../models/User');

// Helper for distance calculation (Haversine Formula)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; 
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}
function deg2rad(deg) { return deg * (Math.PI/180); }

// @desc    Get upcoming events
// @route   GET /api/events
const getEvents = async (req, res) => {
    try {
        const { search, location, lat, lng } = req.query;
        let query = { date: { $gte: new Date() } };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }

        let events = await Event.find(query)
            .populate('organizer', 'name email avatar')
            .populate('comments.user', 'name avatar')
            .lean(); // Use lean to freely mutate objects
            
        // Optional: Relevancy logic if user is logged in
        if (req.user && req.user.id) {
            const user = await User.findById(req.user.id);
            if (user) {
                const userGoals = (user.fitnessGoals || []).map(g => g.toLowerCase());
                const userInterests = (user.interests || []).map(i => i.toLowerCase());
                const userLoc = user.location ? user.location.toLowerCase() : '';

                events.forEach(ev => {
                    let score = 0;
                    const titleLower = ev.title ? ev.title.toLowerCase() : '';
                    const descLower = ev.description ? ev.description.toLowerCase() : '';
                    const evLoc = ev.location ? ev.location.toLowerCase() : '';

                    // String text matching
                    if (userLoc && (evLoc.includes(userLoc) || userLoc.includes(evLoc))) {
                        score += 5; // Reduced from 10, relying more on GPS now
                    }

                    // GPS Distance Check
                    if (lat && lng && ev.coordinates && ev.coordinates.lat && ev.coordinates.lng) {
                        const distance = getDistanceFromLatLonInKm(lat, lng, ev.coordinates.lat, ev.coordinates.lng);
                        if (distance < 5) score += 20; // Very close
                        else if (distance < 20) score += 10; // Close
                        else if (distance < 50) score += 5; // General area
                    }

                    // Goals match adds high relevancy (+5)
                    userGoals.forEach(g => {
                        if (titleLower.includes(g) || descLower.includes(g)) score += 5;
                    });
                    
                    // Interests match adds relevancy (+3)
                    userInterests.forEach(interest => {
                        if (titleLower.includes(interest) || descLower.includes(interest)) score += 3;
                    });

                    ev.relevancyScore = score;
                });

                // Sort by relevancy score DESC, then date ASC
                events.sort((a, b) => {
                    if (b.relevancyScore !== a.relevancyScore) {
                        return b.relevancyScore - a.relevancyScore; 
                    }
                    return new Date(a.date) - new Date(b.date); 
                });
            } else {
                events.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        } else {
            events.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
            
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create an event
// @route   POST /api/events
const createEvent = async (req, res) => {
    try {
        if (req.user.role === 'user') {
            return res.status(403).json({ message: 'Only trainers or admins can create events' });
        }
        
        const { title, description, date, location, coordinates, maxAttendees } = req.body;
        
        const event = new Event({
            title, description, date, location, coordinates, maxAttendees,
            organizer: req.user.id
        });

        const savedEvent = await event.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register for an event
// @route   POST /api/events/:id/register
const registerEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.attendees.includes(req.user.id)) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }

        if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
            return res.status(400).json({ message: 'Event is full' });
        }

        event.attendees.push(req.user.id);
        await event.save();

        // Create notification
        await Notification.create({
            userId: req.user.id,
            type: 'event',
            content: `You have successfully registered for the event: ${event.title}`
        });

        res.json({ message: 'Successfully registered', event });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get event participants (Organizer Only)
// @route   GET /api/events/:id/participants
const getEventParticipants = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('attendees', 'name email avatar role');
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only the organizer can view the full participant list' });
        }

        res.json(event.attendees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a comment to an event
// @route   POST /api/events/:id/comments
const addEventComment = async (req, res) => {
    try {
        const { text } = req.body;
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const comment = {
            user: req.user.id,
            text
        };

        event.comments.push(comment);
        await event.save();

        const populatedEvent = await Event.findById(event._id).populate('comments.user', 'name avatar');
        res.status(201).json(populatedEvent.comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get comments for an event
// @route   GET /api/events/:id/comments
const getEventComments = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('comments.user', 'name avatar');
        if (!event) return res.status(404).json({ message: 'Event not found' });

        res.json(event.comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- V3: Carpooling ---
// @desc    Offer/Request a Carpool for an Event
// @route   POST /api/events/:id/carpool
const offerCarpool = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const { availableSeats, departureTime, location } = req.body;
        
        event.carpools.push({
            driver: req.user.id,
            passengers: [],
            availableSeats,
            departureTime,
            location
        });

        await event.save();
        res.status(201).json({ message: 'Carpool offered', event });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Join a Carpool
// @route   POST /api/events/:id/carpool/:carpoolId/join
const joinCarpool = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const carpool = event.carpools.id(req.params.carpoolId);
        if (!carpool) return res.status(404).json({ message: 'Carpool not found' });

        if (carpool.driver.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot join your own carpool' });
        }

        if (carpool.passengers.includes(req.user.id)) {
            return res.status(400).json({ message: 'Already joined this carpool' });
        }

        if (carpool.passengers.length >= carpool.availableSeats) {
            return res.status(400).json({ message: 'Carpool is full' });
        }

        carpool.passengers.push(req.user.id);
        await event.save();

        res.json({ message: 'Joined carpool successfully', event });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- V3: Event Completion & Leaderboard ---
// @desc    Complete Event and auto-generate post
// @route   POST /api/events/:id/complete
const completeEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only the organizer can complete the event' });
        }

        if (event.isCompleted) {
            return res.status(400).json({ message: 'Event is already marked as completed' });
        }

        const { leaderboardData } = req.body; // Array of { userId, time }
        
        event.isCompleted = true;
        if (leaderboardData && Array.isArray(leaderboardData)) {
            event.leaderboard = leaderboardData.map(d => ({ user: d.userId, time: d.time }));
        }

        await event.save();

        // Auto-generate community post tagging all attendees
        const Post = require('../models/Post');
        let postContent = `Event Completed: **${event.title}**! Thanks to everyone who participated.\n`;
        
        if (event.leaderboard.length > 0) {
            postContent += `\n🏆 Leaderboard:\n`;
            // Simplified: in real app you'd likely map these IDs to names before posting, 
            // or the frontend formats it. We'll let frontend format it if it fetches the post, 
            // but for simplicity, we'll just log the finish.
            postContent += `(Check the event page for full results!)`;
        }

        await Post.create({
            author: req.user.id,
            content: postContent,
            taggedUsers: event.attendees // Tag everyone
        });

        res.json({ message: 'Event completed and post auto-generated', event });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { 
    getEvents, createEvent, registerEvent, getEventParticipants, 
    addEventComment, getEventComments,
    offerCarpool, joinCarpool, completeEvent 
};
