const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const removeAllMessages = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    // Use the same connection logic as other scripts
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vetora';
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true
    });
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Removing all messages...');
    
    // Count messages before removal
    const messagesBefore = await Message.countDocuments();
    console.log(`   📊 Found ${messagesBefore} messages to remove`);
    
    // Remove all messages
    const result = await Message.deleteMany({});
    console.log(`   ✅ Removed ${result.deletedCount} messages`);
    
    // Update conversations to clear lastMessage references
    await Conversation.updateMany({}, { 
      lastMessage: null,
      lastActivity: new Date()
    });
    console.log('   🔄 Updated conversations to clear lastMessage references');
    
    console.log('✅ Messages removal completed');
    console.log('ℹ️  Conversations and other data remain intact');
    process.exit(0);
  } catch (error) {
    console.error('❌ Messages removal failed:', error);
    process.exit(1);
  }
};

removeAllMessages();