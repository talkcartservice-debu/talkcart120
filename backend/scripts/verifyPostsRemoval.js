const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Post = require('../models/Post');

const verifyPostsRemoval = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Checking posts collection...');
    
    // Count remaining posts
    const postsCount = await Post.countDocuments();
    console.log(`📊 Remaining posts: ${postsCount}`);
    
    if (postsCount === 0) {
      console.log('✅ Verification successful: All posts have been removed');
    } else {
      console.log(`⚠️  Verification note: ${postsCount} posts still remain in the database`);
      
      // Show details of remaining posts
      const samplePosts = await Post.find().limit(5).select('content author createdAt');
      console.log('📝 Sample of remaining posts:');
      samplePosts.forEach((post, index) => {
        console.log(`  ${index + 1}. Author: ${post.author}, Created: ${post.createdAt}, Content: ${post.content.substring(0, 50)}...`);
      });
    }
    
    console.log('✅ Verification completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
};

verifyPostsRemoval();