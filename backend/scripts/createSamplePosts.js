const mongoose = require('mongoose');
const { User, Post } = require('../models');

async function createSamplePosts() {
  try {
    console.log('🔧 Creating sample posts for testing...\n');

    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Find or create a test user
    let sampleUser = await User.findOne({ username: 'sample_user' });
    if (!sampleUser) {
      sampleUser = new User({
        username: 'sample_user',
        displayName: 'Sample User',
        email: 'sample@test.com',
        password: 'hashedpassword',
        bio: 'Sample user for testing posts',
        isActive: true
      });
      await sampleUser.save();
      console.log('✅ Created sample user:', sampleUser.username);
    }

    // Create sample posts
    const samplePosts = [
      {
        author: sampleUser._id,
        content: 'Welcome to TalkCart! This is a sample public post. 🎉 #welcome #talkcart',
        type: 'text',
        privacy: 'public',
        hashtags: ['welcome', 'talkcart'],
        views: 150,
        isActive: true
      },
      {
        author: sampleUser._id,
        content: 'Check out this trending post about social media! 📱 #trending #social',
        type: 'text',
        privacy: 'public',
        hashtags: ['trending', 'social'],
        views: 300,
        isActive: true
      },
      {
        author: sampleUser._id,
        content: 'This is a followers-only post for testing privacy settings. 🔒 #followers',
        type: 'text',
        privacy: 'followers',
        hashtags: ['followers'],
        views: 50,
        isActive: true
      },
      {
        author: sampleUser._id,
        content: 'Another public post with high engagement! Like and share! 👍 #engagement',
        type: 'text',
        privacy: 'public',
        hashtags: ['engagement'],
        views: 500,
        isActive: true
      },
      {
        author: sampleUser._id,
        content: 'Testing video post functionality 🎥 #video #test',
        type: 'video',
        privacy: 'public',
        hashtags: ['video', 'test'],
        views: 200,
        isActive: true
      }
    ];

    // Insert sample posts
    for (const postData of samplePosts) {
      const existingPost = await Post.findOne({ 
        author: postData.author, 
        content: postData.content 
      });
      
      if (!existingPost) {
        const post = new Post(postData);
        await post.save();
        console.log('✅ Created post:', post.content.substring(0, 50) + '...');
      }
    }

    console.log('\n🎉 Sample posts created successfully!');
    console.log('📊 You can now test the trending feed at: GET /api/posts?feedType=trending');

  } catch (error) {
    console.error('❌ Error creating sample posts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createSamplePosts();