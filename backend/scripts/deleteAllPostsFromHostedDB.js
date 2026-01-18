#!/usr/bin/env node

/**
 * Script to delete all posts and related data from the database
 * This version uses the environment's MONGODB_URI, which is suitable for deployment
 * 
 * To run this on your hosted app:
 * 1. Deploy this script with your application
 * 2. Execute it through a maintenance endpoint or one-time job
 */

const mongoose = require('mongoose');

// Import models
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Share = require('./models/Share');
const ProductPost = require('./models/ProductPost');

async function deleteAllPostsFromHostedDB() {
  try {
    console.log('🚀 Starting database connection...');
    
    // Connect to MongoDB using the environment variable (this will work in hosted environment)
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart';
    console.log(`🔗 Connecting to database: ${dbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('⚠️  WARNING: This will permanently delete ALL posts and related data!');
    console.log('⚠️  This action cannot be undone.');
    
    // Get confirmation counts before deletion
    const postCount = await Post.countDocuments();
    const commentCount = await Comment.countDocuments();
    const shareCount = await Share.countDocuments();
    const productPostCount = await ProductPost.countDocuments();
    
    console.log('\n📊 Current database counts:');
    console.log(`📝 Posts: ${postCount}`);
    console.log(`💬 Comments: ${postCount}`);
    console.log(`🔄 Shares: ${shareCount}`);
    console.log(`🛍️  Product Posts: ${productPostCount}`);
    console.log(`📈 Total records to delete: ${postCount + commentCount + shareCount + productPostCount}`);
    
    console.log('\n🗑️  Starting deletion process...');
    
    // Track deletion statistics
    let deletedPosts = 0;
    let deletedComments = 0;
    let deletedShares = 0;
    let deletedProductPosts = 0;
    
    // Delete all posts
    if (postCount > 0) {
      console.log('📝 Deleting all posts...');
      const result = await Post.deleteMany({});
      deletedPosts = result.deletedCount;
      console.log(`✅ Deleted ${deletedPosts} posts`);
    }
    
    // Delete all comments
    if (commentCount > 0) {
      console.log('💬 Deleting all comments...');
      const result = await Comment.deleteMany({});
      deletedComments = result.deletedCount;
      console.log(`✅ Deleted ${deletedComments} comments`);
    }
    
    // Delete all shares
    if (shareCount > 0) {
      console.log('🔄 Deleting all shares...');
      const result = await Share.deleteMany({});
      deletedShares = result.deletedCount;
      console.log(`✅ Deleted ${deletedShares} shares`);
    }
    
    // Delete all product posts
    if (productPostCount > 0) {
      console.log('🛍️  Deleting all product posts...');
      const result = await ProductPost.deleteMany({});
      deletedProductPosts = result.deletedCount;
      console.log(`✅ Deleted ${deletedProductPosts} product posts`);
    }
    
    // Final statistics
    const totalDeleted = deletedPosts + deletedComments + deletedShares + deletedProductPosts;
    
    console.log('\n🎉 Deletion completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`📝 Posts deleted: ${deletedPosts}`);
    console.log(`💬 Comments deleted: ${deletedComments}`);
    console.log(`🔄 Shares deleted: ${deletedShares}`);
    console.log(`🛍️  Product Posts deleted: ${deletedProductPosts}`);
    console.log(`📈 Total records deleted: ${totalDeleted}`);
    
    // Verify cleanup
    const remainingPosts = await Post.countDocuments();
    const remainingComments = await Comment.countDocuments();
    const remainingShares = await Share.countDocuments();
    const remainingProductPosts = await ProductPost.countDocuments();
    
    console.log('\n🔍 Verification:');
    console.log(`📝 Remaining posts: ${remainingPosts}`);
    console.log(`💬 Remaining comments: ${remainingComments}`);
    console.log(`🔄 Remaining shares: ${remainingShares}`);
    console.log(`🛍️  Remaining product posts: ${remainingProductPosts}`);
    
    if (remainingPosts === 0 && remainingComments === 0 && remainingShares === 0 && remainingProductPosts === 0) {
      console.log('✅ Database cleanup verified - all related collections are empty');
    } else {
      console.log('⚠️  Some records may still remain in the database');
    }
    
    return {
      deleted: {
        posts: deletedPosts,
        comments: deletedComments,
        shares: deletedShares,
        productPosts: deletedProductPosts
      },
      total: totalDeleted,
      remaining: {
        posts: remainingPosts,
        comments: remainingComments,
        shares: remainingShares,
        productPosts: remainingProductPosts
      }
    };

  } catch (error) {
    console.error('❌ Error during deletion process:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    console.log('👋 Script completed');
  }
}

// If this script is run directly (not imported), execute it
if (require.main === module) {
  deleteAllPostsFromHostedDB()
    .then(result => {
      console.log('\n🏁 Script execution completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { deleteAllPostsFromHostedDB };
