const mongoose = require('mongoose');
const { User } = require('../models');
require('dotenv').config();

async function listUsers() {
  try {
    console.log('📋 Listing all users in the database...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const users = await User.find({}, 'username email displayName createdAt');
    
    console.log(`Found ${users.length} users in the database:`);
    
    if (users.length === 0) {
      console.log('No users found in the database');
      return;
    }

    // Show all users
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.displayName}) - ${user.email}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to list users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script if called directly
if (require.main === module) {
  listUsers();
}

module.exports = { listUsers };