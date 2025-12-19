const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Post = require('../models/Post');

const removeAllPosts = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Removing all posts...');
    
    // Count posts before removal
    const postsBefore = await Post.countDocuments();
    console.log(`   📊 Found ${postsBefore} posts to remove`);
    
    // Remove all posts
    const result = await Post.deleteMany({});
    console.log(`   ✅ Removed ${result.deletedCount} posts`);
    
    console.log('✅ Posts removal completed');
    console.log('ℹ️  Other data (users, products, etc.) remains intact');
    process.exit(0);
  } catch (error) {
    console.error('❌ Posts removal failed:', error);
    process.exit(1);
  }
};

removeAllPosts();