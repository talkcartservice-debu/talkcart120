const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('../models/Product');

const removeAllProducts = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Removing all products...');
    
    // Count products before removal
    const productsBefore = await Product.countDocuments();
    console.log(`   📊 Found ${productsBefore} products to remove`);
    
    // Remove all products
    const result = await Product.deleteMany({});
    console.log(`   ✅ Removed ${result.deletedCount} products`);
    
    console.log('✅ Products removal completed');
    console.log('ℹ️  Other data (users, posts, etc.) remains intact');
    process.exit(0);
  } catch (error) {
    console.error('❌ Products removal failed:', error);
    process.exit(1);
  }
};

removeAllProducts();