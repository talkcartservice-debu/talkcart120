const mongoose = require('mongoose');
const connectDB = require('../config/database');
require('dotenv').config();

const resetDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Dropping all collections...');
    
    // Drop all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`   ✅ Dropped collection: ${collection.name}`);
    }

    console.log('✅ Database reset completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
};

resetDatabase();
