#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { Product, User } = require('../models');

// Sample marketplace data
const sampleProducts = [
  {
    name: 'Digital Art Collection #42',
    description: 'Limited edition digital artwork from renowned artist featuring vibrant colors and modern abstract design. Perfect for NFT collectors and art enthusiasts.',
    price: 0.5,
    currency: 'ETH',
    images: [
      {
        public_id: 'sample/digital-art-1',
        secure_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop&crop=center',
        url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop&crop=center'
      }
    ],
    category: 'Digital Art',
    tags: ['nft', 'art', 'digital', 'collectible', 'abstract'],
    stock: 1,
    featured: true,
    isNFT: true,
    contractAddress: '0x1234567890123456789012345678901234567890',
    tokenId: '42',
    rating: 4.8,
    reviewCount: 15,
    sales: 3,
    views: 127
  },
  {
    name: 'Vintage Gaming Console',
    description: 'Restored vintage gaming console in perfect working condition. Includes original controllers and 10 classic games. A must-have for retro gaming enthusiasts.',
    price: 299.99,
    currency: 'USD',
    images: [
      {
        public_id: 'sample/gaming-console',
        secure_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop&crop=center',
        url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop&crop=center'
      }
    ],
    category: 'Gaming',
    tags: ['vintage', 'console', 'gaming', 'retro', 'collectible'],
    stock: 5,
    featured: true,
    isNFT: false,
    rating: 4.9,
    reviewCount: 23,
    sales: 8,
    views: 245
  },
  {
    name: 'Exclusive Music Album NFT',
    description: 'Exclusive rights to unreleased tracks from top artist. Includes digital album, behind-the-scenes content, and exclusive access to future releases.',
    price: 1.2,
    currency: 'ETH',
    images: [
      {
        public_id: 'sample/music-album',
        secure_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
        url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center'
      }
    ],
    category: 'Music',
    tags: ['music', 'nft', 'exclusive', 'album', 'digital'],
    stock: 1,
    featured: false,
    isNFT: true,
    contractAddress: '0x2345678901234567890123456789012345678901',
    tokenId: '101',
    rating: 4.6,
    reviewCount: 8,
    sales: 1,
    views: 89
  },
  {
    name: 'Designer Hoodie',
    description: 'Limited edition designer hoodie perfect for crypto enthusiasts. Made from premium materials with unique blockchain-inspired design. Unisex sizing available.',
    price: 89.99,
    currency: 'USD',
    images: [
      {
        public_id: 'sample/designer-hoodie',
        secure_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&crop=center',
        url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&crop=center'
      }
    ],
    category: 'Fashion',
    tags: ['fashion', 'hoodie', 'crypto', 'designer', 'limited'],
    stock: 15,
    featured: true,
    isNFT: false,
    rating: 4.7,
    reviewCount: 31,
    sales: 12,
    views: 178
  },
  {
    name: 'Blockchain Programming Book',
    description: 'Comprehensive guide to blockchain development with practical examples. Covers Ethereum, Solidity, Web3, and DeFi protocols. Perfect for developers and enthusiasts.',
    price: 49.99,
    currency: 'USD',
    images: [
      {
        public_id: 'sample/blockchain-book',
        secure_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop&crop=center',
        url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop&crop=center'
      }
    ],
    category: 'Books',
    tags: ['blockchain', 'programming', 'ethereum', 'solidity', 'education'],
    stock: 25,
    featured: false,
    isNFT: false,
    rating: 4.5,
    reviewCount: 18,
    sales: 7,
    views: 134
  },
  {
    name: 'Rare Collectible Card #007',
    description: 'Ultra-rare collectible trading card from the Genesis series. Authenticated and graded. Includes digital certificate of authenticity.',
    price: 2.5,
    currency: 'ETH',
    images: [
      {
        public_id: 'sample/collectible-card',
        secure_url: 'https://images.unsplash.com/photo-1606987493837-ddb8a7ebab98?w=400&h=400&fit=crop&crop=center',
        url: 'https://images.unsplash.com/photo-1606987493837-ddb8a7ebab98?w=400&h=400&fit=crop&crop=center'
      }
    ],
    category: 'Collectibles',
    tags: ['collectible', 'card', 'rare', 'genesis', 'trading'],
    stock: 1,
    featured: true,
    isNFT: true,
    contractAddress: '0x3456789012345678901234567890123456789012',
    tokenId: '007',
    rating: 5.0,
    reviewCount: 3,
    sales: 1,
    views: 67
  },
  {
    name: 'Wireless Gaming Headset',
    description: 'Premium wireless gaming headset with 7.1 surround sound, RGB lighting, and noise cancellation. Compatible with all gaming platforms.',
    price: 159.99,
    currency: 'USD',
    images: [
      {
        public_id: 'sample/gaming-headset',
        secure_url: 'https://images.unsplash.com/photo-1585298723682-7115561c51b7?w=400&h=400&fit=crop&crop=center',
        url: 'https://images.unsplash.com/photo-1585298723682-7115561c51b7?w=400&h=400&fit=crop&crop=center'
      }
    ],
    category: 'Electronics',
    tags: ['headset', 'gaming', 'wireless', 'rgb', 'surround'],
    stock: 12,
    featured: false,
    isNFT: false,
    rating: 4.4,
    reviewCount: 27,
    sales: 9,
    views: 201
  },
  {
    name: 'Crypto Streetwear T-Shirt',
    description: 'Trendy streetwear t-shirt with crypto-inspired design. Made from organic cotton with eco-friendly printing. Available in multiple colors and sizes.',
    price: 29.99,
    currency: 'USD',
    images: [
      {
        public_id: 'sample/crypto-tshirt',
        secure_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center'
      }
    ],
    category: 'Fashion',
    tags: ['streetwear', 'tshirt', 'crypto', 'organic', 'trendy'],
    stock: 30,
    featured: false,
    isNFT: false,
    rating: 4.3,
    reviewCount: 42,
    sales: 18,
    views: 156
  }
];

async function seedMarketplaceData() {
  try {
    console.log('🌱 Starting marketplace data seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if we have any users to assign as vendors
    const users = await User.find().limit(5).lean();
    if (users.length === 0) {
      console.log('⚠️  No users found. Creating sample vendors...');
      
      // Create sample vendor users
      const sampleVendors = [
        {
          username: 'artcreator',
          email: 'art@example.com',
          displayName: 'Art Creator',
          password: '$2b$10$dummy.hash.for.sample.user', // Dummy hash
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
          isVerified: true,
          walletAddress: '0x1111111111111111111111111111111111111111',
          bio: 'Digital artist specializing in NFT collections'
        },
        {
          username: 'retroshop',
          email: 'retro@example.com',
          displayName: 'Retro Shop',
          password: '$2b$10$dummy.hash.for.sample.user',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          isVerified: true,
          walletAddress: '0x2222222222222222222222222222222222222222',
          bio: 'Vintage electronics and gaming gear specialist'
        },
        {
          username: 'musicpro',
          email: 'music@example.com',
          displayName: 'Music Pro',
          password: '$2b$10$dummy.hash.for.sample.user',
          avatar: 'https://randomuser.me/api/portraits/men/68.jpg',
          isVerified: false,
          walletAddress: '0x3333333333333333333333333333333333333333',
          bio: 'Professional music producer and NFT creator'
        },
        {
          username: 'fashionista',
          email: 'fashion@example.com',
          displayName: 'Crypto Fashion',
          password: '$2b$10$dummy.hash.for.sample.user',
          avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
          isVerified: true,
          walletAddress: '0x4444444444444444444444444444444444444444',
          bio: 'Trendy fashion items for the crypto community'
        },
        {
          username: 'techstore',
          email: 'tech@example.com',
          displayName: 'Tech Store',
          password: '$2b$10$dummy.hash.for.sample.user',
          avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
          isVerified: true,
          walletAddress: '0x5555555555555555555555555555555555555555',
          bio: 'Electronics and gadgets for gamers and developers'
        }
      ];

      await User.insertMany(sampleVendors);
      const newUsers = await User.find().limit(5).lean();
      console.log(`✅ Created ${newUsers.length} sample vendor users`);
      users.push(...newUsers);
    }

    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    // Use all sample products for seeding
    const filtered = sampleProducts;

    const productsWithVendors = filtered.map((product, index) => ({
      ...product,
      isActive: true,  // Set products as active so they appear in marketplace
      vendorId: users[index % users.length]._id,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
      updatedAt: new Date()
    }));

    // Insert sample products
    const insertedProducts = await Product.insertMany(productsWithVendors);
    console.log(`✅ Inserted ${insertedProducts.length} sample products (after blacklist filter)`);

    // Create text index for search functionality
    try {
      await Product.collection.createIndex({ 
        name: 'text', 
        description: 'text', 
        tags: 'text' 
      });
      console.log('✅ Created text search index');
    } catch (error) {
      console.log('⚠️  Text index might already exist:', error.message);
    }

    // Log summary
    const productsByCategory = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Marketplace Data Summary:');
    console.log('============================');
    productsByCategory.forEach(cat => {
      console.log(`${cat._id}: ${cat.count} products`);
    });

    const nftCount = await Product.countDocuments({ isNFT: true });
    const physicalCount = await Product.countDocuments({ isNFT: false });
    const featuredCount = await Product.countDocuments({ featured: true });

    console.log(`\nNFTs: ${nftCount}`);
    console.log(`Physical Products: ${physicalCount}`);
    console.log(`Featured Products: ${featuredCount}`);
    
    console.log('\n🎉 Marketplace data seeding completed successfully!');
    console.log('🔗 Visit http://localhost:4000/marketplace to view the products');

  } catch (error) {
    console.error('❌ Error seeding marketplace data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  seedMarketplaceData().catch(console.error);
}

module.exports = seedMarketplaceData;