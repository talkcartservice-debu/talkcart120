#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('../models');

async function checkProducts() {
  try {
    console.log('🔍 Checking remaining products...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Count remaining products
    const count = await Product.countDocuments();
    console.log(`📊 Remaining products in database: ${count}`);

    // Show sample products
    const products = await Product.find({}).limit(10);
    console.log('\n📋 Sample products:');
    products.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name} (ID: ${p._id})`);
    });

    console.log('\n✅ Product check completed successfully!');

  } catch (error) {
    console.error('❌ Error checking products:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  checkProducts().catch(console.error);
}

module.exports = checkProducts;