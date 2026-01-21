const mongoose = require('mongoose');
const { User, Conversation, Message } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for messaging data seeding');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const seedMessagingData = async () => {
  console.log('🚀 Seeding messaging data...');
  
  try {
    // Create test users if they don't exist
    const testUsers = [
      {
        username: 'alice_demo',
        email: 'alice@demo.com',
        displayName: 'Alice Johnson',
        avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
        isVerified: true,
      },
      {
        username: 'bob_demo',
        email: 'bob@demo.com',
        displayName: 'Bob Smith',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
        isVerified: false,
      },
      {
        username: 'charlie_demo',
        email: 'charlie@demo.com',
        displayName: 'Charlie Brown',
        avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
        isVerified: true,
      },
      {
        username: 'diana_demo',
        email: 'diana@demo.com',
        displayName: 'Diana Prince',
        avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
        isVerified: true,
      }
    ];

    const users = [];
    for (const userData of testUsers) {
      let user = await User.findOne({ username: userData.username });
      if (!user) {
        user = new User({
          ...userData,
          password: 'demo123', // This will be hashed by the model
        });
        await user.save();
        console.log(`✅ Created user: ${user.displayName}`);
      } else {
        console.log(`👤 User already exists: ${user.displayName}`);
      }
      users.push(user);
    }

    // Create conversations
    const conversations = [
      {
        participants: [users[0]._id, users[1]._id],
        isGroup: false,
        lastActivity: new Date(),
      },
      {
        participants: [users[0]._id, users[2]._id],
        isGroup: false,
        lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        participants: [users[0]._id, users[1]._id, users[2]._id, users[3]._id],
        isGroup: true,
        groupName: 'Demo Group Chat',
        groupDescription: 'A demo group for testing messaging',
        adminId: users[0]._id,
        lastActivity: new Date(Date.now() - 1800000), // 30 minutes ago
      },
      {
        participants: [users[0]._id, users[3]._id],
        isGroup: false,
        lastActivity: new Date(Date.now() - 7200000), // 2 hours ago
      }
    ];

    const createdConversations = [];
    for (const convData of conversations) {
      // Check if conversation already exists
      const existingConv = await Conversation.findOne({
        participants: { $all: convData.participants, $size: convData.participants.length },
        isGroup: convData.isGroup
      });

      if (!existingConv) {
        const conversation = new Conversation(convData);
        await conversation.save();
        createdConversations.push(conversation);
        console.log(`💬 Created conversation: ${conversation.isGroup ? conversation.groupName : 'Direct Message'}`);
      } else {
        createdConversations.push(existingConv);
        console.log(`💬 Conversation already exists: ${existingConv.isGroup ? existingConv.groupName : 'Direct Message'}`);
      }
    }

    // Create messages for each conversation
    const messageTemplates = [
      { content: "Hey! How are you doing?", senderId: 0 },
      { content: "I'm doing great! Just working on some new projects.", senderId: 1 },
      { content: "That sounds exciting! What kind of projects?", senderId: 0 },
      { content: "Mostly Web3 stuff - building some DeFi applications.", senderId: 1 },
      { content: "Nice! I've been getting into NFTs lately.", senderId: 0 },
      { content: "Cool! Have you minted any?", senderId: 1 },
      { content: "Not yet, but I'm planning to create some digital art.", senderId: 0 },
      { content: "That's awesome! Let me know when you do, I'd love to see them.", senderId: 1 },
    ];

    for (let i = 0; i < createdConversations.length; i++) {
      const conversation = createdConversations[i];
      const numMessages = Math.floor(Math.random() * 8) + 3; // 3-10 messages per conversation
      
      // Check if messages already exist for this conversation
      const existingMessages = await Message.countDocuments({ conversationId: conversation._id });
      
      if (existingMessages === 0) {
        for (let j = 0; j < numMessages; j++) {
          const template = messageTemplates[j % messageTemplates.length];
          const senderIndex = template.senderId % conversation.participants.length;
          
          const message = new Message({
            content: template.content,
            type: 'text',
            senderId: conversation.participants[senderIndex],
            conversationId: conversation._id,
            createdAt: new Date(Date.now() - (numMessages - j) * 300000), // 5 minutes apart
            reactions: [],
            readBy: []
          });
          
          await message.save();
        }
        console.log(`📝 Created ${numMessages} messages for conversation`);
      } else {
        console.log(`📝 Messages already exist for conversation (${existingMessages} messages)`);
      }
    }

    console.log('✅ Messaging data seeded successfully!');
    console.log(`👥 Users: ${users.length}`);
    console.log(`💬 Conversations: ${createdConversations.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding messaging data:', error);
    throw error;
  }
};

const runSeed = async () => {
  try {
    console.log('🚀 Starting Vetora Messaging Data Seeding...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await seedMessagingData();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Messaging data seeding completed successfully!');
    console.log('🎉 You can now test the messaging functionality');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the seeding
runSeed();