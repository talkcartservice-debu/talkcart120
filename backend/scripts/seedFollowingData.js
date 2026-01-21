const mongoose = require('mongoose');
require('dotenv').config();

async function seedFollowingData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vetora');
    console.log('Connected to database');

    const Follow = require('../models/Follow');
    const User = require('../models/User');

    // Get the user who will be following others
    const followerUser = await User.findOne({ username: 'hasangwineza__cedro_mirr' });
    if (!followerUser) {
      console.log('Follower user not found');
      return;
    }

    // Get some users to be followed
    const usersToFollow = await User.find({ 
      username: { $in: ['admin', 'hubstore'] } // Use existing usernames
    });

    if (usersToFollow.length === 0) {
      console.log('No users found to follow');
      return;
    }

    // Remove any existing following relationships for this user to avoid duplicates
    await Follow.deleteMany({ 
      follower: followerUser._id,
      isActive: true
    });

    // Create following relationships
    const followData = usersToFollow.map(user => ({
      follower: followerUser._id,
      following: user._id,
      isActive: true,
      createdAt: new Date()
    }));

    await Follow.insertMany(followData);
    
    console.log(`Added ${followData.length} following relationships for user ${followerUser.username}`);
    
    // Also update follower counts for the followed users
    for (const user of usersToFollow) {
      const followerCount = await Follow.countDocuments({ following: user._id, isActive: true });
      await User.findByIdAndUpdate(user._id, { followerCount: followerCount });
    }
    
    console.log('Following data seeded successfully');
  } catch (error) {
    console.error('Error seeding following data:', error);
  } finally {
    await mongoose.connection.close();
  }
}

seedFollowingData();