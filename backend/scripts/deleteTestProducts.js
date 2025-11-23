#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('../models');

async function deleteTestProducts() {
  try {
    console.log('🗑️  Starting test products deletion...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all products before deletion
    const allProducts = await Product.find({});
    console.log(`📊 Found ${allProducts.length} total products in the database`);

    // Find products that match the sample data from seedMarketplaceData.js
    // These are likely test products that were created during development
    const testProducts = await Product.find({
      $or: [
        { name: { $regex: /Digital Art Collection/i } },
        { name: { $regex: /Vintage Gaming Console/i } },
        { name: { $regex: /Exclusive Music Album NFT/i } },
        { name: { $regex: /Designer Hoodie/i } },
        { name: { $regex: /Blockchain Programming Book/i } },
        { name: { $regex: /Rare Collectible Card/i } },
        { name: { $regex: /Wireless Gaming Headset/i } },
        { name: { $regex: /Crypto Streetwear T-Shirt/i } },
        { description: { $regex: /sample|test|demo/i } },
        { tags: { $in: ['sample', 'test', 'demo'] } }
      ]
    });

    console.log(`🔍 Found ${testProducts.length} potential test products`);

    if (testProducts.length > 0) {
      console.log('\n📋 Test products to be deleted:');
      testProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (ID: ${product._id})`);
      });

      // Automatically proceed with deletion for automation
      console.log('\n⚠️  Automatically proceeding with test products deletion...');

      // Delete test products
      const deletedProducts = await Product.deleteMany({
        _id: { $in: testProducts.map(p => p._id) }
      });

      console.log(`✅ Successfully deleted ${deletedProducts.deletedCount} test products`);
    } else {
      console.log('✅ No test products found to delete');
    }

    // Count remaining products
    const remainingProducts = await Product.countDocuments();
    console.log(`📊 Remaining products in database: ${remainingProducts}`);

    console.log('\n🎉 Test products deletion completed successfully!');

  } catch (error) {
    console.error('❌ Error deleting test products:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  deleteTestProducts().catch(console.error);
}

module.exports = deleteTestProducts;