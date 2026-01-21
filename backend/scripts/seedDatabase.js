const mongoose = require('mongoose');
const { User, Post, Comment } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for database initialization');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const initializeDatabase = async () => {
  console.log('🚀 Initializing database collections...');
  
  // Just ensure collections exist and indexes are created
  // No sample data will be seeded
  try {
    // Create collections if they don't exist
    await User.createCollection();
    await Post.createCollection();
    await Comment.createCollection();
    
    console.log('✅ Database collections initialized');
    console.log('📋 Ready for real user data via API registration');
    
  } catch (error) {
    if (error.code !== 48) { // Collection already exists error
      throw error;
    }
    console.log('✅ Collections already exist');
  }
};

// No sample posts will be seeded - posts come from real user activity
// No sample comments will be seeded - comments come from real user interactions

const initDatabase = async () => {
  try {
    console.log('🚀 Initializing Vetora Database...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await initializeDatabase();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database initialization completed successfully!');
    console.log('📋 Database is ready for real user data');
    console.log('🚀 Start the server and begin user registration!');
    
    // Show current state
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const commentCount = await Comment.countDocuments();
    
    console.log('📊 Current Database State:');
    console.log(`   👥 Users: ${userCount}`);
    console.log(`   📝 Posts: ${postCount}`);
    console.log(`   💬 Comments: ${commentCount}`);
    console.log('');
    console.log('💡 All data will come from real user activity via API calls');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Run initialization if this file is executed directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };