const mongoose = require('mongoose');
const { User } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const checkAdminUsers = async () => {
  try {
    console.log('🔍 Checking for admin users...');
    
    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    
    if (adminUsers.length > 0) {
      console.log(`✅ Found ${adminUsers.length} admin user(s):`);
      adminUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.displayName} (${user.username}) - ${user.email}`);
        console.log(`      Created: ${user.createdAt}`);
        console.log(`      Last Login: ${user.lastLoginAt || 'Never'}`);
        console.log('');
      });
    } else {
      console.log('❌ No admin users found in the database.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
};

const run = async () => {
  try {
    console.log('🚀 TalkCart Admin User Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await checkAdminUsers();
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
};

// Run check if this file is executed directly
if (require.main === module) {
  run();
}

module.exports = { checkAdminUsers };