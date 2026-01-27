const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Load environment variables
dotenv.config();

const deleteAllMessages = async () => {
  try {
    console.log('Connecting to database...');
    
    // Connect to MongoDB
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart';
    await mongoose.connect(dbUri);
    
    console.log('Connected to database successfully');
    
    // Get message count before deletion
    const messageCount = await Message.countDocuments();
    console.log(`Found ${messageCount} messages to delete`);
    
    if (messageCount === 0) {
      console.log('No messages to delete. Database is already clean.');
      return;
    }
    
    // Update conversations to reset last message and message counts before deleting messages
    console.log('Updating conversations to remove references to messages...');
    
    // Find all conversations that have messages and update their lastMessage to null
    await Conversation.updateMany({}, {
      $set: { 
        lastActivity: new Date(),
        lastMessage: null // Set to null instead of unsetting
      }
    });
    
    console.log('Updated conversations successfully');
    
    // Delete all messages
    console.log('Deleting all messages...');
    const deleteResult = await Message.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} messages successfully`);
    
    // Verify deletion
    const remainingCount = await Message.countDocuments();
    console.log(`Remaining messages after deletion: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log('✅ All messages deleted successfully!');
      
      // Update all conversations to have proper empty state
      await Conversation.updateMany({}, {
        $set: {
          lastActivity: new Date(),
          lastMessage: null,
          messageCount: 0
        }
      });
      
      console.log('✅ Conversations updated to clean state');
    } else {
      console.log(`⚠️ Warning: ${remainingCount} messages remain after deletion`);
    }
    
  } catch (error) {
    console.error('❌ Error deleting messages:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  deleteAllMessages();
}

module.exports = deleteAllMessages;