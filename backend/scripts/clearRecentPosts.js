const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import the Post model
const Post = require('../models/Post');

// Import database connection
const connectDB = require('../config/database');

const clearRecentPosts = async (daysBack = 7) => {
  try {
    console.log('🔄 Starting recent posts cleanup...');
    
    // Connect to database
    await connectDB();
    
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    console.log(`📊 Checking posts created after ${cutoffDate.toISOString()}...`);
    
    // Get current post count
    const totalPosts = await Post.countDocuments();
    const recentPosts = await Post.countDocuments({
      createdAt: { $gte: cutoffDate }
    });
    
    console.log(`📝 Total posts in database: ${totalPosts}`);
    console.log(`📝 Recent posts (last ${daysBack} days): ${recentPosts}`);
    
    if (recentPosts === 0) {
      console.log('✅ No recent posts to remove');
      process.exit(0);
    }
    
    // Show some sample recent posts before deletion
    console.log('📋 Sample recent posts to be deleted:');
    const samplePosts = await Post.find({
      createdAt: { $gte: cutoffDate }
    })
      .populate('author', 'username displayName')
      .limit(5)
      .select('content type createdAt author')
      .lean();
    
    samplePosts.forEach((post, index) => {
      const date = new Date(post.createdAt).toLocaleDateString();
      console.log(`  ${index + 1}. [${post.type.toUpperCase()}] ${date} by @${post.author?.username || 'unknown'}: "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`);
    });
    
    // Ask for confirmation (skip in automated environments)
    if (process.env.NODE_ENV !== 'automated') {
      console.log(`\n⚠️  WARNING: This will delete ${recentPosts} posts created in the last ${daysBack} days!`);
      console.log('   This action cannot be undone.');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
      
      // Wait for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('🗑️  Proceeding with deletion...');
    
    // Delete recent posts
    const deleteResult = await Post.deleteMany({
      createdAt: { $gte: cutoffDate }
    });
    
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} recent posts`);
    
    // Verify deletion
    const remainingTotal = await Post.countDocuments();
    const remainingRecent = await Post.countDocuments({
      createdAt: { $gte: cutoffDate }
    });
    
    console.log(`📊 Total posts remaining: ${remainingTotal}`);
    console.log(`📊 Recent posts remaining: ${remainingRecent}`);
    
    if (remainingRecent === 0) {
      console.log('🎉 Recent posts cleanup completed successfully!');
    } else {
      console.warn(`⚠️  Warning: ${remainingRecent} recent posts still remain`);
    }
    
    // Also clear related comments for the deleted posts
    try {
      const Comment = require('../models/Comment');
      const commentDeleteResult = await Comment.deleteMany({
        createdAt: { $gte: cutoffDate }
      });
      console.log(`🗑️  Deleted ${commentDeleteResult.deletedCount} recent comments`);
    } catch (err) {
      console.log('ℹ️  No comments collection found or could not delete recent comments');
    }
    
    console.log('✨ Recent posts cleanup process completed!');
    
  } catch (error) {
    console.error('❌ Error during recent posts cleanup:', error);
    console.error('💡 Make sure MongoDB is running and accessible');
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
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
  process.exit(0);
});

// Parse command line arguments
const args = process.argv.slice(2);
const daysBack = args[0] ? parseInt(args[0]) : 7;

if (isNaN(daysBack) || daysBack < 0) {
  console.error('❌ Invalid number of days. Please provide a positive number.');
  console.log('Usage: node clearRecentPosts.js [days]');
  console.log('Example: node clearRecentPosts.js 3  (deletes posts from last 3 days)');
  process.exit(1);
}

// Run the cleanup
if (require.main === module) {
  console.log(`🗑️  Cleaning posts from the last ${daysBack} days...`);
  clearRecentPosts(daysBack);
}

module.exports = clearRecentPosts;