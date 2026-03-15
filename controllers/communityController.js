const Group = require('../models/Group');
const Post = require('../models/Post');
const User = require('../models/User'); // V3 Streak System

// @desc    Create a community group
// @route   POST /api/community/groups
const createGroup = async (req, res) => {
    try {
        const { name, description, isSquad } = req.body; // Added isSquad
        const group = new Group({
            name,
            description,
            creator: req.user.id,
            members: [req.user.id], // Creator is added by default
            isSquad: isSquad || false,
            lastActivityDate: Date.now()
        });
        const savedGroup = await group.save();

        // --- ADDED: Create associated ChatRoom ---
        const ChatRoom = require('../models/ChatRoom');
        await ChatRoom.create({
            participants: [req.user.id],
            type: 'group',
            groupRef: savedGroup._id
        });
        // -----------------------------------------

        res.status(201).json(savedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all community groups
// @route   GET /api/community/groups
const getGroups = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const groups = await Group.find(query).populate('creator', 'name avatar');
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Join a group
// @route   POST /api/community/groups/:id/join
const joinGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.members.includes(req.user.id)) {
            return res.status(400).json({ message: 'Already a member' });
        }

        group.members.push(req.user.id);
        await group.save();

        // --- ADDED: Add user to associated ChatRoom ---
        const ChatRoom = require('../models/ChatRoom');
        const chatRoom = await ChatRoom.findOne({ groupRef: group._id });
        if (chatRoom && !chatRoom.participants.includes(req.user.id)) {
            chatRoom.participants.push(req.user.id);
            await chatRoom.save();
        }
        // ----------------------------------------------

        res.json({ message: 'Joined successfully', group });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a moderator to a group
// @route   POST /api/community/groups/:id/moderator
const addModerator = async (req, res) => {
    try {
        const { userId } = req.body;
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.creator.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only creator or admin can add moderators' });
        }

        if (group.moderators.includes(userId)) {
            return res.status(400).json({ message: 'User is already a moderator' });
        }

        if (!group.members.includes(userId)) {
            group.members.push(userId); // Ensure they are a member
        }

        group.moderators.push(userId);
        await group.save();
        res.json({ message: 'Moderator added successfully', group });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a Post
// @route   POST /api/community/posts
const createPost = async (req, res) => {
    try {
        const { content, groupId, imageUrl, taggedUsers } = req.body;
        const post = new Post({
            author: req.user.id,
            content,
            imageUrl: imageUrl || '',
            taggedUsers: Array.isArray(taggedUsers) ? taggedUsers : [],
            group: groupId || null
        });
        const savedPost = await post.save();

        // V3 Streak System: Check for Daily Post
        const user = await User.findById(req.user.id);
        if (user) {
            const today = new Date();
            today.setHours(0,0,0,0);
            
            if (!user.lastPostDate) {
                user.streak = 1;
                user.lastPostDate = new Date();
                await user.save();
            } else {
                const lastPost = new Date(user.lastPostDate);
                lastPost.setHours(0,0,0,0);
                
                const diffTime = Math.abs(today - lastPost);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    user.streak += 1;
                    user.lastPostDate = new Date();
                    await user.save();
                } else if (diffDays > 1) {
                    user.streak = 1;
                    user.lastPostDate = new Date();
                    await user.save();
                }
                // If diffDays === 0, it means they already posted today, so streak is unchanged
            }
        }

        res.status(201).json(savedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get 20 recent posts
// @route   GET /api/community/posts
const getPosts = async (req, res) => {
    try {
        const { groupId } = req.query;
        let query = {};
        
        if (groupId && groupId !== 'global') {
            query.group = groupId;
        } else if (groupId === 'global') {
             query.group = null; // show only global posts
        }
        // If no groupId provided, it fetches all posts (legacy behavior)

        const posts = await Post.find(query)
            .populate('author', 'name role avatar')
            .populate('group', 'name')
            .populate('taggedUsers', 'name')
            .populate('comments.user', 'name avatar')
            .sort({ isPinned: -1, createdAt: -1 })
            .limit(20);
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Like a Post
// @route   POST /api/community/posts/:id/like
const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.likes.includes(req.user.id)) {
            post.likes = post.likes.filter(id => id.toString() !== req.user.id); // Unlike
        } else {
            post.likes.push(req.user.id); // Like
        }

        await post.save();
        res.json({ message: 'Updated', likes: post.likes.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a comment to a Post
// @route   POST /api/community/posts/:id/comment
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: 'Comment text is required' });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        post.comments.push({
            user: req.user.id,
            text
        });

        await post.save();
        res.status(201).json({ message: 'Comment added', comments: post.comments });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single post by ID (with populated comments)
// @route   GET /api/community/posts/:id
const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'name role avatar')
            .populate('comments.user', 'name avatar');
            
        if (!post) return res.status(404).json({ message: 'Post not found' });
        
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Pin or Unpin a Post (Moderators/Creators only)
// @route   POST /api/community/posts/:id/pin
const pinPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('group');
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.group) {
            const group = await Group.findById(post.group._id);
            const isModerator = group.moderators.includes(req.user.id) || group.creator.toString() === req.user.id;
            if (!isModerator) return res.status(403).json({ message: 'Not authorized' });
        } else {
            // If it's a global post, maybe only admin can pin. For now, just authorize author or admin.
            if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        post.isPinned = !post.isPinned;
        await post.save();
        res.json({ message: post.isPinned ? 'Post Pinned' : 'Post Unpinned', isPinned: post.isPinned });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a Post (Moderators/Creators/Admin only)
// @route   DELETE /api/community/posts/:id
const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        let isAuthorized = false;
        if (req.user.role === 'admin' || post.author.toString() === req.user.id) {
            isAuthorized = true;
        } else if (post.group) {
            const group = await Group.findById(post.group);
            if (group && (group.moderators.includes(req.user.id) || group.creator.toString() === req.user.id)) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) return res.status(403).json({ message: 'Not authorized to delete' });

        await post.deleteOne();
        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- V3: Journeys ---
// @desc    Create a Journey
// @route   POST /api/community/journeys
const createJourney = async (req, res) => {
    try {
        const { name, goal, endDate } = req.body;
        const Journey = require('../models/Journey');
        
        const journey = new Journey({
            name,
            goal,
            user: req.user.id,
            endDate
        });
        
        const savedJourney = await journey.save();
        res.status(201).json(savedJourney);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's Journeys
// @route   GET /api/community/journeys
const getJourneys = async (req, res) => {
    try {
        const Journey = require('../models/Journey');
        const journeys = await Journey.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(journeys);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createGroup, getGroups, joinGroup, addModerator,
    createPost, getPosts, getPostById, likePost, addComment,
    pinPost, deletePost,
    createJourney, getJourneys // Added Journey
};
