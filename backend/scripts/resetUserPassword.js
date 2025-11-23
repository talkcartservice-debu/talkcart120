const mongoose = require('mongoose');
const { User } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for password reset');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const resetPassword = async (email, newPassword) => {
  if (!email || !newPassword) {
    console.error('❌ Email and new password are required. Usage: node scripts/resetUserPassword.js <email> <newPassword>');
    process.exit(1);
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email "${email}" not found.`);
      process.exit(1);
    }

    console.log(`🔄 Resetting password for user: ${user.username} (${user.email})`);
    
    // Set the new password. The 'pre-save' middleware will hash it.
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password for ${user.email} has been reset successfully.`);
    
  } catch (error) {
    console.error('❌ Password reset failed:', error);
    process.exit(1);
  }
};

const main = async () => {
  await connectDB();
  
  // Get email and password from command line arguments
  const email = process.argv;
  const newPassword = process.argv;

  await resetPassword(email, newPassword);

  process.exit(0);
};

main();