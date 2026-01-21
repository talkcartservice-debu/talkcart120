const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');

const removeAllUsers = async () => {
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

    console.log('🗑️ Removing all users...');
    
    // Count users before removal
    const usersBefore = await User.countDocuments();
    console.log(`   📊 Found ${usersBefore} users to remove`);
    
    // Remove all users
    const result = await User.deleteMany({});
    console.log(`   ✅ Removed ${result.deletedCount} users`);
    
    console.log('✅ Users removal completed');
    console.log('ℹ️  Other data (posts, products, etc.) remains intact');
    process.exit(0);
  } catch (error) {
    console.error('❌ Users removal failed:', error);
    process.exit(1);
  }
};

removeAllUsers();