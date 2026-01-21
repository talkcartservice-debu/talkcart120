#!/usr/bin/env node

/**
 * Script to delete all posts and related data from the database (no confirmation)
 * This will remove:
 * - All posts from the Post collection
 * - All comments from the Comment collection
 * - All shares from the Share collection
 * - All product posts from the ProductPost collection
 * 
 * ⚠️ USE WITH CAUTION - THIS WILL PERMANENTLY DELETE DATA
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import models
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Share = require('../models/Share');
const ProductPost = require('../models/ProductPost');

async function deleteAllPostsSilent() {
  try {
    console.log('🚀 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vetora', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('🗑️  Deleting all posts and related data...');
    
    // Get initial counts
    const initialCounts = {
      posts: await Post.countDocuments(),
      comments: await Comment.countDocuments(),
      shares: await Share.countDocuments(),
      productPosts: await ProductPost.countDocuments()
    };
    
    console.log(`📊 Found ${initialCounts.posts} posts, ${initialCounts.comments} comments, ${initialCounts.shares} shares, ${initialCounts.productPosts} product posts`);
    
    // Delete all data
    const results = await Promise.all([
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Share.deleteMany({}),
      ProductPost.deleteMany({})
    ]);
    
    const deletedCounts = {
      posts: results[0].deletedCount,
      comments: results[1].deletedCount,
      shares: results[2].deletedCount,
      productPosts: results[3].deletedCount
    };
    
    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
    
    console.log('\n✅ Deletion completed!');
    console.log('📊 Results:');
    console.log(`📝 Posts deleted: ${deletedCounts.posts}`);
    console.log(`💬 Comments deleted: ${deletedCounts.comments}`);
    console.log(`🔄 Shares deleted: ${deletedCounts.shares}`);
    console.log(`🛍️  Product Posts deleted: ${deletedCounts.productPosts}`);
    console.log(`📈 Total deleted: ${totalDeleted}`);
    
    // Verify cleanup
    const remaining = {
      posts: await Post.countDocuments(),
      comments: await Comment.countDocuments(),
      shares: await Share.countDocuments(),
      productPosts: await ProductPost.countDocuments()
    };
    
    console.log('\n🔍 Verification:');
    console.log(`📝 Remaining posts: ${remaining.posts}`);
    console.log(`💬 Remaining comments: ${remaining.comments}`);
    console.log(`🔄 Remaining shares: ${remaining.shares}`);
    console.log(`🛍️  Remaining product posts: ${remaining.productPosts}`);
    
    if (Object.values(remaining).every(count => count === 0)) {
      console.log('✅ All collections successfully cleared!');
    } else {
      console.log('⚠️  Some data may still remain');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
deleteAllPostsSilent();
