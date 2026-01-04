const mongoose = require('mongoose');
const Follow = require('../models/Follow');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for testing');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const testFollowers = async () => {
  const userId = '694eaa955fcd303fa1053b75'; // Your user ID from the logs
  
  console.log(`🔍 Testing followers for user: ${userId}`);
  
  try {
    // Check followers (people who follow this user)
    const followers = await Follow.find({ 
      following: new mongoose.Types.ObjectId(userId),
      isActive: true
    }).populate('follower', 'username displayName');
    
    console.log(`📋 Followers count: ${followers.length}`);
    console.log('👥 Followers:');
    followers.forEach(follow => {
      console.log(`   - ${follow.follower.username} (${follow.follower.displayName})`);
    });
    
    // Check following (people this user follows)
    const following = await Follow.find({ 
      follower: new mongoose.Types.ObjectId(userId),
      isActive: true
    }).populate('following', 'username displayName');
    
    console.log(`📋 Following count: ${following.length}`);
    console.log('👤 Following:');
    following.forEach(follow => {
      console.log(`   - ${follow.following.username} (${follow.following.displayName})`);
    });
    
    // Check if user exists
    const user = await User.findById(userId);
    console.log(`\n📋 User exists: ${!!user}`);
    if (user) {
      console.log(`📊 User followerCount: ${user.followerCount || 0}`);
      console.log(`📊 User followingCount: ${user.followingCount || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing followers:', error);
    throw error;
  }
};

const runTest = async () => {
  try {
    console.log('🚀 Running follower/following test...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await testFollowers();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runTest();
}

module.exports = { runTest };