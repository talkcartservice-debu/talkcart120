const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Message, Conversation } = require('../models');

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const deleteAllMessages = async () => {
  try {
    // Connect to database
    const connection = await connectDB();
    
    console.log('Starting automated message deletion process...');
    
    // 1. Count messages before deletion
    const messageCount = await Message.countDocuments();
    console.log(`Found ${messageCount} messages to delete`);
    
    // 2. Count conversations before updating
    const conversationCount = await Conversation.countDocuments();
    console.log(`Found ${conversationCount} conversations to update`);
    
    if (messageCount === 0) {
      console.log('No messages found to delete');
      await connection.connection.close();
      process.exit(0);
    }
    
    // 3. Delete all messages
    const deleteResult = await Message.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} messages`);
    
    // 4. Update all conversations to remove lastMessage references
    const updateResult = await Conversation.updateMany(
      {},
      { $unset: { lastMessage: "" } }
    );
    console.log(`Updated ${updateResult.modifiedCount} conversations to remove lastMessage references`);
    
    console.log('Message deletion completed successfully!');
    
    // 5. Close database connection
    await connection.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during deletion:', error);
    process.exit(1);
  }
};

// Run the deletion
deleteAllMessages();