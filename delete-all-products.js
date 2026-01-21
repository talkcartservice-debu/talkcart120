/**
 * Script to delete all products from the database
 * This script will hard delete all products from the database
 */

const mongoose = require('mongoose');

// Import the Product model
const Product = require('./models/Product');

// MongoDB connection string - adjust as needed for your environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vetora';

async function deleteAllProducts() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    
    // Get count of existing products before deletion
    const productCount = await Product.countDocuments({});
    console.log(`Found ${productCount} products in the database`);
    
    if (productCount === 0) {
      console.log('No products found in the database');
      return;
    }
    
    // Confirm deletion
    console.log('About to delete ALL products from the database...');
    console.log('This action cannot be undone!');
    
    // Wait for a moment to allow user to see the warning
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Delete all products
    const deletionResult = await Product.deleteMany({});
    console.log(`Deleted ${deletionResult.deletedCount} products successfully`);
    
    // Verify that all products are gone
    const remainingCount = await Product.countDocuments({});
    console.log(`Remaining products in database: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log('All products have been successfully deleted from the database');
    } else {
      console.warn(`Warning: ${remainingCount} products remain in the database`);
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error deleting products:', error);
    
    // Close the connection in case of error
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
    
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  deleteAllProducts();
}

module.exports = deleteAllProducts;