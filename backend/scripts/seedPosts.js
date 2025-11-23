const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Post, User } = require('../models');

const samplePosts = [
  {
    content: 'Welcome to TalkCart! 🎉 This is a revolutionary Web3 social commerce platform where you can shop, connect, and earn. #TalkCart #Web3 #SocialCommerce',
    type: 'text',
    privacy: 'public',
    hashtags: ['talkcart', 'web3', 'socialcommerce'],
    views: 1250,
  },
  {
    content: 'Check out our latest products in the marketplace! From electronics to fashion, we have everything you need. 🛍️ #Shopping #Marketplace #Deals',
    type: 'text',
    privacy: 'public',
    hashtags: ['shopping', 'marketplace', 'deals'],
    views: 890,
  },
  {
    content: 'Just joined the community! Excited to connect with amazing people and discover great products. 💫 #NewHere #Community',
    type: 'text',
    privacy: 'public',
    hashtags: ['newhere', 'community'],
    views: 456,
  },
  {
    content: 'Live streaming tonight at 8 PM! Join me as I showcase the hottest tech gadgets of the season. Don\'t miss it! 🎮 #LiveStream #Tech #Gaming',
    type: 'text',
    privacy: 'public',
    hashtags: ['livestream', 'tech', 'gaming'],
    views: 2100,
  },
  {
    content: 'Loving the new DAO governance features! Community-driven decisions are the future. 🚀 #DAO #Governance #Community',
    type: 'text',
    privacy: 'public',
    hashtags: ['dao', 'governance', 'community'],
    views: 678,
  },
  {
    content: 'Pro tip: Always check vendor ratings before making a purchase. Quality matters! ⭐ #ShoppingTips #SmartShopping',
    type: 'text',
    privacy: 'public',
    hashtags: ['shoppingtips', 'smartshopping'],
    views: 543,
  },
  {
    content: 'The NFT marketplace is 🔥! Just minted my first NFT on TalkCart. Check it out! #NFT #DigitalArt #Crypto',
    type: 'text',
    privacy: 'public',
    hashtags: ['nft', 'digitalart', 'crypto'],
    views: 1890,
  },
  {
    content: 'Had an amazing shopping experience today! Fast delivery and great customer service. Highly recommend! 👍 #CustomerService #HappyCustomer',
    type: 'text',
    privacy: 'public',
    hashtags: ['customerservice', 'happycustomer'],
    views: 321,
  },
  {
    content: 'Building something cool with the TalkCart API. The possibilities are endless! 💻 #Developer #API #Innovation',
    type: 'text',
    privacy: 'public',
    hashtags: ['developer', 'api', 'innovation'],
    views: 987,
  },
  {
    content: 'Weekend vibes! Time to browse the marketplace and find some great deals. What are you shopping for? 🛒 #WeekendShopping #Deals',
    type: 'text',
    privacy: 'public',
    hashtags: ['weekendshopping', 'deals'],
    views: 756,
  },
];

async function seedPosts() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');

    // Find or create a default user to assign posts to
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

    // Clear existing posts (optional - comment out if you want to keep existing posts)
    const existingPostsCount = await Post.countDocuments();
    console.log(`📊 Found ${existingPostsCount} existing posts`);
    
    if (existingPostsCount > 0) {
      console.log('⚠️  Existing posts found. Skipping deletion to preserve data.');
    }

    // Create sample posts
    console.log('📝 Creating sample posts...');
    const createdPosts = [];

    for (const postData of samplePosts) {
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
      console.log(`✅ Created post: "${post.content.substring(0, 50)}..."`);
    }

    console.log(`\n🎉 Successfully created ${createdPosts.length} sample posts!`);
    console.log(`📊 Total posts in database: ${await Post.countDocuments()}`);

    // Display some stats
    console.log('\n📈 Post Statistics:');
    console.log(`   - Total posts: ${await Post.countDocuments()}`);
    console.log(`   - Public posts: ${await Post.countDocuments({ privacy: 'public' })}`);
    console.log(`   - Active posts: ${await Post.countDocuments({ isActive: true })}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding posts:', error);
    process.exit(1);
  }
}

// Run the seed function
seedPosts();
