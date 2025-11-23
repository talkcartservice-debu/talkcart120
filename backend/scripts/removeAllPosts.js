const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import required models
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Import database connection
const connectDB = require('../config/database');

const removeAllPosts = async () => {
  try {
    console.log('🔄 Starting complete posts removal process...');
    
    // Connect to database
    await connectDB();
    
    console.log('📊 Checking current database state...');
    
    // Get current counts
    const postCount = await Post.countDocuments();
    const commentCount = await Comment.countDocuments();
    
    console.log(`📝 Found ${postCount} posts and ${commentCount} comments in the database`);
    
    if (postCount === 0 && commentCount === 0) {
      console.log('✅ Database is already clean - no posts or comments to remove');
      process.exit(0);
    }
    
    // Show some sample data before deletion
    if (postCount > 0) {
      console.log('📋 Sample posts before deletion:');
      const samplePosts = await Post.find({})
        .limit(3)
        .select('content type createdAt author')
        .lean();
      
      samplePosts.forEach((post, index) => {
        const date = new Date(post.createdAt).toLocaleDateString();
        console.log(`  ${index + 1}. [${post.type.toUpperCase()}] ${date}: "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`);
      });
    }
    
    // Ask for confirmation (skip in automated environments)
    if (process.env.NODE_ENV !== 'automated') {
      console.log('\n⚠️  WARNING: This will permanently delete ALL posts and related comments from the database!');
      console.log('   This action cannot be undone.');
      console.log('   Press Ctrl+C to cancel, or wait 10 seconds to proceed...');
      
      // Wait for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('🗑️  Proceeding with deletion...');
    
    // Delete all posts
    const postDeleteResult = await Post.deleteMany({});
    console.log(`✅ Successfully deleted ${postDeleteResult.deletedCount} posts`);
    
    // Delete all comments (since they're related to posts)
    const commentDeleteResult = await Comment.deleteMany({});
    console.log(`✅ Successfully deleted ${commentDeleteResult.deletedCount} comments`);
    
    // Verify deletion
    const remainingPostCount = await Post.countDocuments();
    const remainingCommentCount = await Comment.countDocuments();
    
    console.log(`📊 Posts remaining in database: ${remainingPostCount}`);
    console.log(`📊 Comments remaining in database: ${remainingCommentCount}`);
    
    if (remainingPostCount === 0 && remainingCommentCount === 0) {
      console.log('🎉 Complete posts removal completed successfully!');
      console.log('📝 All posts and related comments have been removed from the database');
      console.log('✅ Application functionality is maintained - users can create new posts');
    } else {
      console.warn(`⚠️  Warning: ${remainingPostCount} posts and ${remainingCommentCount} comments still remain in the database`);
    }
    
    console.log('✨ Posts removal process completed!');
    console.log('🔄 Application is ready for fresh content creation');
    
  } catch (error) {
    console.error('❌ Error during posts removal:', error);
    console.error('💡 Make sure MongoDB is running and accessible');
    console.error('💡 Check your MONGODB_URI in the .env file');
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (closeError) {
      console.error('❌ Error closing database connection:', closeError);
    }
    process.exit(0);
  }
};

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Process interrupted by user');
  try {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Process terminated');
  try {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
  process.exit(0);
});

// Run the removal process
if (require.main === module) {
  removeAllPosts();
}

module.exports = removeAllPosts;