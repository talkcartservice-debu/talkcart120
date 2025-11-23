const mongoose = require('mongoose');
const { User } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for admin user creation');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    console.log('🚀 Creating admin user...');
    
    const adminEmail = 'talkcartservice@gmail.com';
    const adminPassword = 'Mirror@2024';
    const adminUsername = 'talkcart_admin';
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: adminEmail },
        { username: adminUsername },
        { role: 'admin' }
      ]
    });
    
    if (existingAdmin) {
      console.log('📋 Admin user already exists. Updating credentials...');
      
      // Update existing admin user
      existingAdmin.email = adminEmail;
      existingAdmin.username = adminUsername;
      existingAdmin.displayName = 'TalkCart Admin';
      existingAdmin.password = adminPassword; // This will be hashed by the pre-save middleware
      existingAdmin.role = 'admin';
      existingAdmin.isVerified = true;
      existingAdmin.lastLoginAt = new Date();
      
      await existingAdmin.save();
      console.log('✅ Admin user credentials updated successfully!');
    } else {
      // Create new admin user
      const adminUser = new User({
        username: adminUsername,
        displayName: 'TalkCart Admin',
        email: adminEmail,
        password: adminPassword, // This will be hashed by the pre-save middleware
        role: 'admin',
        isVerified: true,
        lastLoginAt: new Date()
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Admin Login Credentials:');
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPassword}`);
    console.log(`   👤 Username: ${adminUsername}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    console.log('🚀 TalkCart Admin User Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await createAdminUser();
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  createAdmin();
}

module.exports = { createAdmin };