const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the User model
const { User } = require('../models');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Delete admin user
const deleteAdminUser = async () => {
  try {
    const connection = await connectDB();
    
    console.log('Looking for user with email: talkcartservice@gmail.com or username: supporter');
    
    // Check if user exists first
    const existingUser = await User.findOne({
      $or: [
        { email: 'talkcartservice@gmail.com' },
        { username: 'supporter' }
      ]
    });
    
    if (existingUser) {
      console.log(`Found user: ${existingUser.username} (${existingUser.email})`);
      
      // Delete user with email talkcartservice@gmail.com or username supporter
      const result = await User.deleteOne({
        $or: [
          { email: 'talkcartservice@gmail.com' },
          { username: 'supporter' }
        ]
      });
      
      console.log(`Deleted ${result.deletedCount} user(s)`);
    } else {
      console.log('No user found with the specified email or username');
    }
    
    // Close the connection
    await connection.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

deleteAdminUser();