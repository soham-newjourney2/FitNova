const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

// @desc    Get all chat rooms for current user
// @route   GET /api/chat/rooms
const getRooms = async (req, res) => {
    try {
        const rooms = await ChatRoom.find({ participants: req.user.id })
            .populate('participants', 'name avatar role')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'name' }
            })
            .populate('groupRef', 'name')
            .sort({ updatedAt: -1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get or create a direct chat room with another user
// @route   POST /api/chat/rooms/direct/:userId
const getOrCreateDirectRoom = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        if (req.user.id === otherUserId) {
            return res.status(400).json({ message: 'Cannot chat with yourself' });
        }

        let room = await ChatRoom.findOne({
            type: 'direct',
            participants: { $all: [req.user.id, otherUserId] }
        }).populate('participants', 'name avatar role');

        if (!room) {
            room = new ChatRoom({
                participants: [req.user.id, otherUserId],
                type: 'direct'
            });
            await room.save();
            room = await ChatRoom.findById(room._id).populate('participants', 'name avatar role');
        }

        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get messages for a room
// @route   GET /api/chat/rooms/:roomId/messages
const getMessages = async (req, res) => {
    try {
        const room = await ChatRoom.findById(req.params.roomId);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        
        if (!room.participants.includes(req.user.id) && room.type !== 'group') {
             return res.status(403).json({ message: 'Not authorized for this room' });
        }

        const messages = await Message.find({ chatRoomId: req.params.roomId })
            .populate('sender', 'name avatar')
            .sort({ createdAt: 1 });
            
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send a message
// @route   POST /api/chat/rooms/:roomId/messages
const sendMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const room = await ChatRoom.findById(req.params.roomId);
        
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const message = new Message({
            chatRoomId: req.params.roomId,
            sender: req.user.id,
            content,
            readBy: [req.user.id]
        });

        const savedMessage = await message.save();

        room.lastMessage = savedMessage._id;
        room.updatedAt = Date.now();
        await room.save();

        // --- ADDED: Create Notification for other participants ---
        const Notification = require('../models/Notification');
        for (const participantId of room.participants) {
            if (participantId.toString() !== req.user.id.toString()) {
                await Notification.create({
                    userId: participantId,
                    type: 'message',
                    content: `New message received`
                });
            }
        }
        // ---------------------------------------------------------

        const populatedMessage = await Message.findById(savedMessage._id).populate('sender', 'name avatar');
        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getRooms, getOrCreateDirectRoom, getMessages, sendMessage };
