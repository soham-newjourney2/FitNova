const mongoose = require('mongoose');
require('dotenv').config();
const Group = require('./models/Group');
const ChatRoom = require('./models/ChatRoom');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const syncGroups = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fitnova');
        console.log('MongoDB connected successfully');

        const groups = await Group.find();
        console.log(`Found ${groups.length} groups.`);

        for (const group of groups) {
            let chatRoom = await ChatRoom.findOne({ groupRef: group._id });
            if (!chatRoom) {
                console.log(`Creating chat room for group: ${group.name}`);
                chatRoom = new ChatRoom({
                    type: 'group',
                    groupRef: group._id,
                    participants: group.members
                });
                await chatRoom.save();
            } else {
                console.log(`Updating participants for chat room of group: ${group.name}`);
                chatRoom.participants = group.members;
                await chatRoom.save();
            }
        }
        console.log('Sync complete.,ts 2. pass"');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

syncGroups();
