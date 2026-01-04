const mongoose = require('mongoose');
const Follow = require('../models/Follow');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for follow data seeding');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const seedFollowData = async () => {
  console.log('🚀 Seeding follow relationships...');
  
  try {
    // Get all users in the database
    const users = await User.find({}, '_id').limit(10);
    
    if (users.length < 2) {
      console.log('⚠️  Not enough users to create follow relationships. Please create at least 2 users first.');
      return;
    }
    
    console.log(`📋 Found ${users.length} users to create follow relationships`);
    
    // Clear existing follow relationships to avoid duplicates
    await Follow.deleteMany({});
    console.log('🗑️  Cleared existing follow relationships');
    
    // Create some follow relationships
    // User 0 follows Users 1, 2, 3
    // User 1 follows Users 2, 3, 4
    // etc.
    let followCount = 0;
    
    for (let i = 0; i < users.length - 1; i++) {
      const followerId = users[i]._id;
      
      // Each user follows the next 2 users
      for (let j = 1; j <= 2 && (i + j) < users.length; j++) {
        const followingId = users[i + j]._id;
        
        // Check if relationship already exists
        const existingFollow = await Follow.findOne({
          follower: followerId,
          following: followingId
        });
        
        if (!existingFollow) {
          await Follow.create({
            follower: followerId,
            following: followingId,
            isActive: true
          });
          followCount++;
          console.log(`✅ User ${followerId} now follows User ${followingId}`);
        } else {
          console.log(`⚠️  Relationship already exists: User ${followerId} follows User ${followingId}`);
        }
      }
    }
    
    // Update follower/following counts in User documents
    for (const user of users) {
      const followingCount = await Follow.countDocuments({ 
        follower: user._id, 
        isActive: true 
      });
      
      const followerCount = await Follow.countDocuments({ 
        following: user._id, 
        isActive: true 
      });
      
      await User.findByIdAndUpdate(user._id, {
        followingCount,
        followerCount
      });
      
      console.log(`📊 Updated User ${user._id}: ${followerCount} followers, ${followingCount} following`);
    }
    
    console.log(`🎉 Successfully created ${followCount} follow relationships!`);
    
  } catch (error) {
    console.error('❌ Error seeding follow data:', error);
    throw error;
  }
};

const seedFollows = async () => {
  try {
    console.log('🚀 Initializing follow data seeding...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await seedFollowData();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Follow data seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Follow data seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedFollows();
}

module.exports = { seedFollows };