const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Post, User } = require('../models');

// Sample posts with images and videos
const postsWithMedia = [
  // Video posts
  {
    content: 'Check out this amazing gaming montage! 🎮 Best plays of the week! #Gaming #Montage #EpicPlays',
    type: 'video',
    privacy: 'public',
    hashtags: ['gaming', 'montage', 'epicplays'],
    views: 5420,
    media: [{
      public_id: 'sample_video_1',
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/dog.mp4',
      url: 'https://res.cloudinary.com/demo/video/upload/v1/dog.mp4',
      resource_type: 'video',
      format: 'mp4',
      duration: 10,
    }]
  },
  {
    content: 'New product unboxing! This tech is incredible! 📦✨ #Unboxing #Tech #Review',
    type: 'video',
    privacy: 'public',
    hashtags: ['unboxing', 'tech', 'review'],
    views: 3210,
    media: [{
      public_id: 'sample_video_2',
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/sea-turtle.mp4',
      url: 'https://res.cloudinary.com/demo/video/upload/v1/sea-turtle.mp4',
      resource_type: 'video',
      format: 'mp4',
      duration: 15,
    }]
  },
  {
    content: 'Live stream highlights! Thanks for joining! 🔴 #LiveStream #Highlights #Community',
    type: 'video',
    privacy: 'public',
    hashtags: ['livestream', 'highlights', 'community'],
    views: 8900,
    media: [{
      public_id: 'sample_video_3',
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1/elephants.mp4',
      url: 'https://res.cloudinary.com/demo/video/upload/v1/elephants.mp4',
      resource_type: 'video',
      format: 'mp4',
      duration: 20,
    }]
  },
  // Image posts
  {
    content: 'Beautiful sunset today! 🌅 Nature is amazing! #Sunset #Photography #Nature',
    type: 'image',
    privacy: 'public',
    hashtags: ['sunset', 'photography', 'nature'],
    views: 2345,
    media: [{
      public_id: 'sample_image_1',
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
      resource_type: 'image',
      format: 'jpg',
      width: 1920,
      height: 1080,
    }]
  },
  {
    content: 'New product arrived! Check out this beauty! 📸 #Product #Shopping #NewArrival',
    type: 'image',
    privacy: 'public',
    hashtags: ['product', 'shopping', 'newarrival'],
    views: 1890,
    media: [{
      public_id: 'sample_image_2',
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/food.jpg',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/food.jpg',
      resource_type: 'image',
      format: 'jpg',
      width: 1920,
      height: 1080,
    }]
  },
  {
    content: 'Weekend vibes! 🎨 Art and creativity! #Art #Creative #Weekend',
    type: 'image',
    privacy: 'public',
    hashtags: ['art', 'creative', 'weekend'],
    views: 3456,
    media: [{
      public_id: 'sample_image_3',
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/coffee.jpg',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/coffee.jpg',
      resource_type: 'image',
      format: 'jpg',
      width: 1920,
      height: 1080,
    }]
  },
  {
    content: 'My workspace setup! Love this clean setup! 💻 #Workspace #Setup #Tech',
    type: 'image',
    privacy: 'public',
    hashtags: ['workspace', 'setup', 'tech'],
    views: 4567,
    media: [{
      public_id: 'sample_image_4',
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/shoes.jpg',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/shoes.jpg',
      resource_type: 'image',
      format: 'jpg',
      width: 1920,
      height: 1080,
    }]
  },
  // Mixed content - more text posts
  {
    content: 'Just finished an amazing workout! 💪 Feeling energized! #Fitness #Workout #Health',
    type: 'text',
    privacy: 'public',
    hashtags: ['fitness', 'workout', 'health'],
    views: 876,
  },
  {
    content: 'Coffee and code ☕️💻 Perfect combination for productivity! #Developer #Coding #Coffee',
    type: 'text',
    privacy: 'public',
    hashtags: ['developer', 'coding', 'coffee'],
    views: 1234,
  },
  {
    content: 'Excited about the new features coming to TalkCart! 🚀 Big updates ahead! #TalkCart #Updates #Excited',
    type: 'text',
    privacy: 'public',
    hashtags: ['talkcart', 'updates', 'excited'],
    views: 2890,
  },
];

async function seedPostsWithMedia() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');

    // Find admin user
    let defaultUser = await User.findOne({ role: 'admin' });
    
    if (!defaultUser) {
      console.log('⚠️  No admin user found, looking for any user...');
      defaultUser = await User.findOne();
    }

    if (!defaultUser) {
      console.log('❌ No users found in database. Please create a user first.');
      console.log('   Run: cd backend && node scripts/seedDatabase.js');
      process.exit(1);
    }

    console.log(`📝 Using user: ${defaultUser.username} (${defaultUser._id})`);

    // Get existing posts count
    const existingPostsCount = await Post.countDocuments();
    console.log(`📊 Found ${existingPostsCount} existing posts`);

    // Create posts with media
    console.log('📝 Creating posts with images and videos...');
    const createdPosts = [];

    for (const postData of postsWithMedia) {
      const post = new Post({
        ...postData,
        author: defaultUser._id,
        isActive: true,
        likes: [],
        bookmarks: [],
        shares: [],
      });

      await post.save();
      createdPosts.push(post);
      
      const mediaType = post.type === 'video' ? '🎥 VIDEO' : post.type === 'image' ? '🖼️  IMAGE' : '📝 TEXT';
      console.log(`✅ Created ${mediaType} post: "${post.content.substring(0, 50)}..."`);
    }

    console.log(`\n🎉 Successfully created ${createdPosts.length} posts with media!`);
    console.log(`📊 Total posts in database: ${await Post.countDocuments()}`);

    // Display detailed stats
    console.log('\n📈 Post Statistics:');
    console.log(`   - Total posts: ${await Post.countDocuments()}`);
    console.log(`   - Text posts: ${await Post.countDocuments({ type: 'text' })}`);
    console.log(`   - Image posts: ${await Post.countDocuments({ type: 'image' })}`);
    console.log(`   - Video posts: ${await Post.countDocuments({ type: 'video' })}`);
    console.log(`   - Public posts: ${await Post.countDocuments({ privacy: 'public' })}`);
    console.log(`   - Active posts: ${await Post.countDocuments({ isActive: true })}`);

    // Show some sample posts
    console.log('\n📋 Sample posts by type:');
    const textPost = await Post.findOne({ type: 'text' }).populate('author', 'username');
    const imagePost = await Post.findOne({ type: 'image' }).populate('author', 'username');
    const videoPost = await Post.findOne({ type: 'video' }).populate('author', 'username');
    
    if (textPost) console.log(`   📝 Text: "${textPost.content.substring(0, 40)}..."`);
    if (imagePost) console.log(`   🖼️  Image: "${imagePost.content.substring(0, 40)}..." (media: ${imagePost.media.length})`);
    if (videoPost) console.log(`   🎥 Video: "${videoPost.content.substring(0, 40)}..." (media: ${videoPost.media.length})`);

    console.log('\n✅ All post types are now available in the database!');
    console.log('🌐 Visit http://localhost:4000/social to see them on the frontend!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding posts:', error);
    process.exit(1);
  }
}

// Run the seed function
seedPostsWithMedia();
