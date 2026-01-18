const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import models
const Post = require('../models/Post');
const User = require('../models/User');

async function createTestPost() {
  try {
    console.log('🔧 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find a test user (or create one if none exists)
    let user = await User.findOne({ username: 'testuser' });
    
    if (!user) {
      console.log('👤 Creating test user...');
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        role: 'user'
      });
      await user.save();
      console.log('✅ Test user created');
    } else {
      console.log('👤 Using existing test user');
    }
    
    // Create a test post
    console.log('📝 Creating test post...');
    const post = new Post({
      author: user._id,
      content: 'This is a test post for verifying the comment system. Feel free to add comments!',
      type: 'text',
      privacy: 'public',
      isActive: true
    });
    
    await post.save();
    await post.populate('author', 'username displayName avatar isVerified');
    
    console.log('✅ Test post created successfully!');
    console.log('📝 Post ID:', post._id);
    console.log('📝 Post content:', post.content);
    console.log('👤 Author:', post.author.displayName);
    
    // Verify we can fetch the post
    const fetchedPost = await Post.findById(post._id)
      .populate('author', 'username displayName avatar isVerified');
    
    console.log('🔍 Verified post fetch works');
    console.log('📝 Fetched content:', fetchedPost.content);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestPost();
