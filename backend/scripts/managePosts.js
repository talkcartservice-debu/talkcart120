#!/usr/bin/env node

/**
 * Unified script for managing posts and related data
 * Supports deletion, verification, and silent operations
 * Usage: 
 *   node managePosts.js delete [--silent] [--hosted]
 *   node managePosts.js verify
 *   node managePosts.js help
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const { argv } = require('process');

// Import models
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Share = require('../models/Share');
const ProductPost = require('../models/ProductPost');

class PostManager {
  constructor(options = {}) {
    this.silent = options.silent || false;
    this.hosted = options.hosted || false;
    this.mongoUri = this.getHostedUri() || process.env.MONGODB_URI || 'mongodb://localhost:27017/vetora';
  }

  getHostedUri() {
    if (this.hosted) {
      // Add hosted database URIs here
      return process.env.HOSTED_MONGODB_URI || process.env.MONGODB_URI;
    }
    return null;
  }

  async connect() {
    if (!this.silent) {
      console.log('🔄 Connecting to MongoDB...');
    }
    
    await mongoose.connect(this.mongoUri);
    
    if (!this.silent) {
      console.log('✅ Connected to MongoDB');
    }
  }

  async disconnect() {
    await mongoose.connection.close();
    if (!this.silent) {
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async getCounts() {
    return {
      posts: await Post.countDocuments(),
      comments: await Comment.countDocuments(),
      shares: await Share.countDocuments(),
      productPosts: await ProductPost.countDocuments()
    };
  }

  async deleteAll() {
    try {
      await this.connect();
      
      if (!this.silent) {
        console.log('⚠️  WARNING: This will permanently delete ALL posts and related data!');
        console.log('⚠️  This action cannot be undone.');
      }

      const counts = await this.getCounts();
      const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

      if (!this.silent) {
        console.log('\n📊 Current database counts:');
        console.log(`📝 Posts: ${counts.posts}`);
        console.log(`💬 Comments: ${counts.comments}`);
        console.log(`🔄 Shares: ${counts.shares}`);
        console.log(`🛍️  Product Posts: ${counts.productPosts}`);
        console.log(`📈 Total records to delete: ${totalRecords}`);
      }

      // Get user confirmation if not silent
      if (!this.silent) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise((resolve) => {
          readline.question('\n⚠️  Type "DELETE ALL POSTS" to confirm deletion: ', resolve);
        });

        readline.close();

        if (answer !== 'DELETE ALL POSTS') {
          console.log('❌ Operation cancelled. No data was deleted.');
          await this.disconnect();
          return;
        }
      }

      if (!this.silent) {
        console.log('\n🗑️  Starting deletion process...');
      }

      // Track deletion statistics
      let deletedPosts = 0;
      let deletedComments = 0;
      let deletedShares = 0;
      let deletedProductPosts = 0;

      // Delete all posts
      if (counts.posts > 0) {
        if (!this.silent) console.log('📝 Deleting all posts...');
        const result = await Post.deleteMany({});
        deletedPosts = result.deletedCount;
        if (!this.silent) console.log(`✅ Deleted ${deletedPosts} posts`);
      }

      // Delete all comments
      if (counts.comments > 0) {
        if (!this.silent) console.log('💬 Deleting all comments...');
        const result = await Comment.deleteMany({});
        deletedComments = result.deletedCount;
        if (!this.silent) console.log(`✅ Deleted ${deletedComments} comments`);
      }

      // Delete all shares
      if (counts.shares > 0) {
        if (!this.silent) console.log('🔄 Deleting all shares...');
        const result = await Share.deleteMany({});
        deletedShares = result.deletedCount;
        if (!this.silent) console.log(`✅ Deleted ${deletedShares} shares`);
      }

      // Delete all product posts
      if (counts.productPosts > 0) {
        if (!this.silent) console.log('🛍️  Deleting all product posts...');
        const result = await ProductPost.deleteMany({});
        deletedProductPosts = result.deletedCount;
        if (!this.silent) console.log(`✅ Deleted ${deletedProductPosts} product posts`);
      }

      const totalDeleted = deletedPosts + deletedComments + deletedShares + deletedProductPosts;

      if (!this.silent) {
        console.log('\n🎉 Deletion completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`📝 Posts deleted: ${deletedPosts}`);
        console.log(`💬 Comments deleted: ${deletedComments}`);
        console.log(`🔄 Shares deleted: ${deletedShares}`);
        console.log(`🛍️  Product Posts deleted: ${deletedProductPosts}`);
        console.log(`📈 Total records deleted: ${totalDeleted}`);
      }

      // Verify cleanup
      const remainingCounts = await this.getCounts();
      const remainingTotal = Object.values(remainingCounts).reduce((sum, count) => sum + count, 0);

      if (!this.silent) {
        console.log('\n🔍 Verification:');
        console.log(`📝 Remaining posts: ${remainingCounts.posts}`);
        console.log(`💬 Remaining comments: ${remainingCounts.comments}`);
        console.log(`🔄 Remaining shares: ${remainingCounts.shares}`);
        console.log(`🛍️  Remaining product posts: ${remainingCounts.productPosts}`);

        if (remainingTotal === 0) {
          console.log('✅ Database cleanup verified - all related collections are empty');
        } else {
          console.log('⚠️  Some records may still remain in the database');
        }
      }

      return {
        success: true,
        deleted: {
          posts: deletedPosts,
          comments: deletedComments,
          shares: deletedShares,
          productPosts: deletedProductPosts,
          total: totalDeleted
        },
        remaining: remainingCounts
      };

    } catch (error) {
      console.error('❌ Error during deletion process:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async verify() {
    try {
      await this.connect();
      
      if (!this.silent) {
        console.log('🔍 Verifying database cleanup...');
      }

      const counts = await this.getCounts();
      const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

      if (!this.silent) {
        console.log('\n📊 Current database counts:');
        console.log(`📝 Posts: ${counts.posts}`);
        console.log(`💬 Comments: ${counts.comments}`);
        console.log(`🔄 Shares: ${counts.shares}`);
        console.log(`🛍️  Product Posts: ${counts.productPosts}`);
      }

      const hasRemainingData = Object.values(counts).some(count => count > 0);

      if (hasRemainingData) {
        if (!this.silent) {
          console.log('\n❌ Verification FAILED - Some data still remains:');
          
          if (counts.posts > 0) {
            console.log(`📝 ${counts.posts} posts still exist`);
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
        }
      } else {
        if (!this.silent) {
          console.log('\n✅ VERIFICATION SUCCESSFUL!');
          console.log('🎉 All posts and related data have been completely removed');
          console.log('✨ Database is clean and ready for fresh content');
        }
      }

      if (!this.silent) {
        console.log(`\n📈 Total records in social collections: ${totalRecords}`);
      }

      return {
        success: true,
        hasRemainingData,
        counts,
        totalRecords
      };

    } catch (error) {
      console.error('❌ Error during verification:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Parse command line arguments
async function main() {
  const args = argv.slice(2);
  const command = args[0];
  const options = {
    silent: args.includes('--silent'),
    hosted: args.includes('--hosted')
  };

  const manager = new PostManager(options);

  try {
    switch (command) {
      case 'delete':
        await manager.deleteAll();
        break;
      case 'verify':
        await manager.verify();
        break;
      case 'help':
      default:
        console.log(`
📦 Vetora Post Management Tool

Usage: node managePosts.js <command> [options]

Commands:
  delete    Delete all posts and related data
  verify    Verify database cleanup status
  help      Show this help message

Options:
  --silent  Run without user prompts (for automation)
  --hosted  Use hosted database connection

Examples:
  node managePosts.js delete
  node managePosts.js delete --silent
  node managePosts.js verify
  node managePosts.js verify --silent
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { PostManager };