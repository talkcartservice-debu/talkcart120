#!/usr/bin/env node

/**
 * Script to verify that all posts and related data have been removed from the database
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import models
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Share = require('../models/Share');
const ProductPost = require('../models/ProductPost');

async function verifyRemoval() {
  try {
    console.log('🔍 Verifying database cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Count remaining records in each collection
    const counts = {
      posts: await Post.countDocuments(),
      comments: await Comment.countDocuments(),
      shares: await Share.countDocuments(),
      productPosts: await ProductPost.countDocuments()
    };
    
    console.log('\n📊 Current database counts:');
    console.log(`📝 Posts: ${counts.posts}`);
    console.log(`💬 Comments: ${counts.comments}`);
    console.log(`🔄 Shares: ${counts.shares}`);
    console.log(`🛍️  Product Posts: ${counts.productPosts}`);
    
    // Check if any collections still have data
    const hasRemainingData = Object.values(counts).some(count => count > 0);
    
    if (hasRemainingData) {
      console.log('\n❌ Verification FAILED - Some data still remains:');
      
      // Show details of remaining records
      if (counts.posts > 0) {
        console.log(`📝 ${counts.posts} posts still exist`);
        const samplePosts = await Post.find().limit(5).select('content author createdAt');
        console.log('Sample posts:');
        samplePosts.forEach((post, index) => {
          console.log(`  ${index + 1}. Author: ${post.author}, Created: ${post.createdAt}`);
        });
      }
      
      if (counts.comments > 0) {
        console.log(`💬 ${counts.comments} comments still exist`);
      }
      
      if (counts.shares > 0) {
        console.log(`🔄 ${counts.shares} shares still exist`);
      }
      
      if (counts.productPosts > 0) {
        console.log(`🛍️  ${counts.productPosts} product posts still exist`);
      }
      
      // Try to find orphaned records (records that reference non-existent posts)
      console.log('\n🔍 Checking for orphaned records...');
      
      // Check comments with invalid post references
      const orphanedComments = await Comment.find({
        post: { $nin: await Post.distinct('_id') }
      });
      
      if (orphanedComments.length > 0) {
        console.log(`⚠️  Found ${orphanedComments.length} orphaned comments`);
        await Comment.deleteMany({
          post: { $nin: await Post.distinct('_id') }
        });
        console.log('✅ Cleaned up orphaned comments');
      }
      
      // Check shares with invalid post references
      const orphanedShares = await Share.find({
        post: { $nin: await Post.distinct('_id') }
      });
      
      if (orphanedShares.length > 0) {
        console.log(`⚠️  Found ${orphanedShares.length} orphaned shares`);
        await Share.deleteMany({
          post: { $nin: await Post.distinct('_id') }
        });
        console.log('✅ Cleaned up orphaned shares');
      }
      
    } else {
      console.log('\n✅ VERIFICATION SUCCESSFUL!');
      console.log('🎉 All posts and related data have been completely removed');
      console.log('✨ Database is clean and ready for fresh content');
    }
    
    // Additional verification - check for any documents at all
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`\n📈 Total records in social collections: ${totalRecords}`);
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    console.log('👋 Verification completed');
  }
}

// Run the verification
verifyRemoval();
