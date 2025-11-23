const mongoose = require('mongoose');
const config = require('../config/config');

/**
 * Database Optimization Script
 * Creates optimal indexes for all models to improve query performance
 */

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Create indexes for User model
 */
const optimizeUserIndexes = async () => {
  const User = mongoose.model('User');
  const collection = User.collection;
  
  console.log('🔧 Optimizing User indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ username: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ walletAddress: 1 }, { unique: true, sparse: true });
    
    // Search and filtering indexes
    await collection.createIndex({ username: 'text', displayName: 'text', bio: 'text' });
    await collection.createIndex({ isActive: 1, isSuspended: 1 });
    await collection.createIndex({ role: 1, isActive: 1 });
    await collection.createIndex({ kycStatus: 1, isActive: 1 });
    await collection.createIndex({ isVerified: 1, isActive: 1 });
    
    // Activity and engagement indexes
    await collection.createIndex({ followerCount: -1, isActive: 1 });
    await collection.createIndex({ postCount: -1, isActive: 1 });
    await collection.createIndex({ lastLoginAt: -1 });
    await collection.createIndex({ lastSeenAt: -1 });
    await collection.createIndex({ createdAt: -1 });
    
    // Location-based indexes
    await collection.createIndex({ 'location.coordinates': '2dsphere' });
    
    // Social media indexes
    await collection.createIndex({ googleId: 1 }, { sparse: true });
    await collection.createIndex({ facebookId: 1 }, { sparse: true });
    await collection.createIndex({ appleId: 1 }, { sparse: true });
    
    console.log('✅ User indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating User indexes:', error.message);
  }
};

/**
 * Create indexes for Post model
 */
const optimizePostIndexes = async () => {
  const Post = mongoose.model('Post');
  const collection = Post.collection;
  
  console.log('🔧 Optimizing Post indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ author: 1, createdAt: -1 });
    await collection.createIndex({ type: 1, createdAt: -1 });
    await collection.createIndex({ privacy: 1, createdAt: -1 });
    
    // Search and content indexes
    await collection.createIndex({ content: 'text', hashtags: 'text' });
    await collection.createIndex({ hashtags: 1, createdAt: -1 });
    await collection.createIndex({ mentions: 1, createdAt: -1 });
    
    // Engagement indexes
    await collection.createIndex({ 'likes.user': 1, createdAt: -1 });
    await collection.createIndex({ 'shares.user': 1, createdAt: -1 });
    await collection.createIndex({ 'bookmarks.user': 1, createdAt: -1 });
    await collection.createIndex({ 'comments.user': 1, createdAt: -1 });
    
    // Compound indexes for common queries
    await collection.createIndex({ author: 1, privacy: 1, createdAt: -1 });
    await collection.createIndex({ type: 1, privacy: 1, createdAt: -1 });
    await collection.createIndex({ isActive: 1, privacy: 1, createdAt: -1 });
    
    // Location-based indexes
    await collection.createIndex({ 'location.coordinates': '2dsphere' });
    
    // Media indexes
    await collection.createIndex({ 'media.resource_type': 1, createdAt: -1 });
    
    // Trending and popularity indexes
    await collection.createIndex({ 
      'likes': 1, 
      'shares': 1, 
      'comments': 1, 
      createdAt: -1 
    });
    
    console.log('✅ Post indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Post indexes:', error.message);
  }
};

/**
 * Create indexes for Product model
 */
const optimizeProductIndexes = async () => {
  const Product = mongoose.model('Product');
  const collection = Product.collection;
  
  console.log('🔧 Optimizing Product indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ vendorId: 1, createdAt: -1 });
    await collection.createIndex({ category: 1, isActive: 1 });
    await collection.createIndex({ isActive: 1, featured: 1 });
    
    // Search and filtering indexes
    await collection.createIndex({ name: 'text', description: 'text', tags: 'text' });
    await collection.createIndex({ tags: 1, isActive: 1 });
    await collection.createIndex({ price: 1, currency: 1, isActive: 1 });
    await collection.createIndex({ category: 1, price: 1, isActive: 1 });
    
    // Availability and stock indexes
    await collection.createIndex({ availability: 1, isActive: 1 });
    await collection.createIndex({ inStock: 1, isActive: 1 });
    await collection.createIndex({ stock: 1, isActive: 1 });
    
    // Rating and review indexes
    await collection.createIndex({ rating: -1, reviewCount: -1, isActive: 1 });
    await collection.createIndex({ reviewCount: -1, isActive: 1 });
    
    // Sales and popularity indexes
    await collection.createIndex({ sales: -1, isActive: 1 });
    await collection.createIndex({ views: -1, isActive: 1 });
    
    // NFT-specific indexes
    await collection.createIndex({ isNFT: 1, isActive: 1 });
    await collection.createIndex({ contractAddress: 1, tokenId: 1 }, { sparse: true });
    
    // Discount and promotion indexes
    await collection.createIndex({ discount: -1, isActive: 1 });
    await collection.createIndex({ freeShipping: 1, isActive: 1 });
    await collection.createIndex({ fastDelivery: 1, isActive: 1 });
    await collection.createIndex({ prime: 1, isActive: 1 });
    
    // Compound indexes for common queries
    await collection.createIndex({ 
      category: 1, 
      price: 1, 
      rating: -1, 
      isActive: 1 
    });
    await collection.createIndex({ 
      vendorId: 1, 
      isActive: 1, 
      createdAt: -1 
    });
    
    console.log('✅ Product indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Product indexes:', error.message);
  }
};

/**
 * Create indexes for Comment model
 */
const optimizeCommentIndexes = async () => {
  const Comment = mongoose.model('Comment');
  const collection = Comment.collection;
  
  console.log('🔧 Optimizing Comment indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ post: 1, createdAt: -1 });
    await collection.createIndex({ author: 1, createdAt: -1 });
    await collection.createIndex({ parentId: 1, createdAt: -1 });
    
    // Content search indexes
    await collection.createIndex({ content: 'text' });
    
    // Engagement indexes
    await collection.createIndex({ 'likes.user': 1, createdAt: -1 });
    await collection.createIndex({ 'replies.user': 1, createdAt: -1 });
    
    // Status and moderation indexes
    await collection.createIndex({ isActive: 1, createdAt: -1 });
    await collection.createIndex({ isDeleted: 1, createdAt: -1 });
    
    // Compound indexes for common queries
    await collection.createIndex({ 
      post: 1, 
      parentId: 1, 
      isActive: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      author: 1, 
      isActive: 1, 
      createdAt: -1 
    });
    
    console.log('✅ Comment indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Comment indexes:', error.message);
  }
};

/**
 * Create indexes for Order model
 */
const optimizeOrderIndexes = async () => {
  const Order = mongoose.model('Order');
  const collection = Order.collection;
  
  console.log('🔧 Optimizing Order indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ customer: 1, createdAt: -1 });
    await collection.createIndex({ vendor: 1, createdAt: -1 });
    await collection.createIndex({ status: 1, createdAt: -1 });
    
    // Payment indexes
    await collection.createIndex({ paymentMethod: 1, createdAt: -1 });
    await collection.createIndex({ paymentStatus: 1, createdAt: -1 });
    await collection.createIndex({ transactionId: 1 }, { sparse: true });
    
    // Product and item indexes
    await collection.createIndex({ 'items.product': 1, createdAt: -1 });
    await collection.createIndex({ 'items.vendor': 1, createdAt: -1 });
    
    // Shipping indexes
    await collection.createIndex({ 'shipping.status': 1, createdAt: -1 });
    await collection.createIndex({ 'shipping.trackingNumber': 1 }, { sparse: true });
    
    // Financial indexes
    await collection.createIndex({ totalAmount: 1, createdAt: -1 });
    await collection.createIndex({ currency: 1, createdAt: -1 });
    
    // Compound indexes for common queries
    await collection.createIndex({ 
      customer: 1, 
      status: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      vendor: 1, 
      status: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      status: 1, 
      paymentStatus: 1, 
      createdAt: -1 
    });
    
    console.log('✅ Order indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Order indexes:', error.message);
  }
};

/**
 * Create indexes for Message model
 */
const optimizeMessageIndexes = async () => {
  const Message = mongoose.model('Message');
  const collection = Message.collection;
  
  console.log('🔧 Optimizing Message indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ conversation: 1, createdAt: -1 });
    await collection.createIndex({ sender: 1, createdAt: -1 });
    await collection.createIndex({ recipient: 1, createdAt: -1 });
    
    // Message type and status indexes
    await collection.createIndex({ type: 1, createdAt: -1 });
    await collection.createIndex({ isRead: 1, createdAt: -1 });
    await collection.createIndex({ isDeleted: 1, createdAt: -1 });
    
    // Content search indexes
    await collection.createIndex({ content: 'text' });
    
    // Compound indexes for common queries
    await collection.createIndex({ 
      conversation: 1, 
      isDeleted: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      recipient: 1, 
      isRead: 1, 
      createdAt: -1 
    });
    
    console.log('✅ Message indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Message indexes:', error.message);
  }
};

/**
 * Create indexes for NFT model
 */
const optimizeNFTIndexes = async () => {
  const NFT = mongoose.model('NFT');
  const collection = NFT.collection;
  
  console.log('🔧 Optimizing NFT indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ owner: 1, createdAt: -1 });
    await collection.createIndex({ creator: 1, createdAt: -1 });
    await collection.createIndex({ status: 1, createdAt: -1 });
    
    // Blockchain and contract indexes
    await collection.createIndex({ blockchain: 1, createdAt: -1 });
    await collection.createIndex({ contractAddress: 1, tokenId: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ contractAddress: 1, createdAt: -1 });
    
    // Collection and rarity indexes
    await collection.createIndex({ collectionName: 1, createdAt: -1 });
    await collection.createIndex({ rarity: 1, createdAt: -1 });
    
    // Price and currency indexes
    await collection.createIndex({ price: 1, currency: 1, status: 1 });
    await collection.createIndex({ currency: 1, status: 1, createdAt: -1 });
    
    // Search indexes
    await collection.createIndex({ name: 'text', description: 'text' });
    
    // Transaction indexes
    await collection.createIndex({ mintTxHash: 1 }, { sparse: true });
    await collection.createIndex({ listingTxHash: 1 }, { sparse: true });
    await collection.createIndex({ saleTxHash: 1 }, { sparse: true });
    
    // Compound indexes for common queries
    await collection.createIndex({ 
      owner: 1, 
      status: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      creator: 1, 
      status: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      collectionName: 1, 
      rarity: 1, 
      price: 1 
    });
    
    console.log('✅ NFT indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating NFT indexes:', error.message);
  }
};

/**
 * Create indexes for Follow model
 */
const optimizeFollowIndexes = async () => {
  const Follow = mongoose.model('Follow');
  const collection = Follow.collection;
  
  console.log('🔧 Optimizing Follow indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ follower: 1, following: 1 }, { unique: true });
    await collection.createIndex({ follower: 1, createdAt: -1 });
    await collection.createIndex({ following: 1, createdAt: -1 });
    
    // Status indexes
    await collection.createIndex({ isActive: 1, createdAt: -1 });
    
    // Compound indexes for common queries
    await collection.createIndex({ 
      follower: 1, 
      isActive: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      following: 1, 
      isActive: 1, 
      createdAt: -1 
    });
    
    console.log('✅ Follow indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Follow indexes:', error.message);
  }
};

/**
 * Create indexes for Notification model
 */
const optimizeNotificationIndexes = async () => {
  const Notification = mongoose.model('Notification');
  const collection = Notification.collection;
  
  console.log('🔧 Optimizing Notification indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ user: 1, createdAt: -1 });
    await collection.createIndex({ type: 1, createdAt: -1 });
    await collection.createIndex({ isRead: 1, createdAt: -1 });
    
    // Related entity indexes
    await collection.createIndex({ relatedUser: 1, createdAt: -1 });
    await collection.createIndex({ relatedPost: 1, createdAt: -1 });
    await collection.createIndex({ relatedProduct: 1, createdAt: -1 });
    
    // Status indexes
    await collection.createIndex({ isActive: 1, createdAt: -1 });
    
    // Compound indexes for common queries
    await collection.createIndex({ 
      user: 1, 
      isRead: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      user: 1, 
      type: 1, 
      isRead: 1, 
      createdAt: -1 
    });
    
    console.log('✅ Notification indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Notification indexes:', error.message);
  }
};

/**
 * Create indexes for DAO model
 */
const optimizeDAOIndexes = async () => {
  const DAO = mongoose.model('DAO');
  const collection = DAO.collection;
  
  console.log('🔧 Optimizing DAO indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ name: 1 }, { unique: true });
    await collection.createIndex({ creator: 1, createdAt: -1 });
    await collection.createIndex({ isActive: 1, createdAt: -1 });
    
    // Search indexes
    await collection.createIndex({ name: 'text', description: 'text' });
    
    // Member and governance indexes
    await collection.createIndex({ 'members.user': 1, createdAt: -1 });
    await collection.createIndex({ 'members.role': 1, createdAt: -1 });
    
    // Treasury indexes
    await collection.createIndex({ 'treasury.balance': -1 });
    await collection.createIndex({ 'treasury.currency': 1 });
    
    console.log('✅ DAO indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating DAO indexes:', error.message);
  }
};

/**
 * Create indexes for Proposal model
 */
const optimizeProposalIndexes = async () => {
  const Proposal = mongoose.model('Proposal');
  const collection = Proposal.collection;
  
  console.log('🔧 Optimizing Proposal indexes...');
  
  try {
    // Basic indexes
    await collection.createIndex({ dao: 1, createdAt: -1 });
    await collection.createIndex({ proposer: 1, createdAt: -1 });
    await collection.createIndex({ status: 1, createdAt: -1 });
    
    // Voting indexes
    await collection.createIndex({ 'votes.voter': 1, createdAt: -1 });
    await collection.createIndex({ 'votes.choice': 1, createdAt: -1 });
    
    // Timeline indexes
    await collection.createIndex({ startDate: 1, endDate: 1 });
    await collection.createIndex({ endDate: 1, status: 1 });
    
    // Search indexes
    await collection.createIndex({ title: 'text', description: 'text' });
    
    // Compound indexes for common queries
    await collection.createIndex({ 
      dao: 1, 
      status: 1, 
      createdAt: -1 
    });
    await collection.createIndex({ 
      status: 1, 
      endDate: 1, 
      createdAt: -1 
    });
    
    console.log('✅ Proposal indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating Proposal indexes:', error.message);
  }
};

/**
 * Main optimization function
 */
const optimizeDatabase = async () => {
  try {
    console.log('🚀 Starting database optimization...');
    
    await connectDB();
    
    // Create indexes for all models
    await optimizeUserIndexes();
    await optimizePostIndexes();
    await optimizeProductIndexes();
    await optimizeCommentIndexes();
    await optimizeOrderIndexes();
    await optimizeMessageIndexes();
    await optimizeNFTIndexes();
    await optimizeFollowIndexes();
    await optimizeNotificationIndexes();
    await optimizeDAOIndexes();
    await optimizeProposalIndexes();
    
    console.log('✅ Database optimization completed successfully!');
    
    // Display index statistics
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\n📊 Index Statistics:');
    for (const collection of collections) {
      const stats = await db.collection(collection.name).stats();
      console.log(`${collection.name}: ${stats.indexes} indexes, ${stats.count} documents`);
    }
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run optimization if called directly
if (require.main === module) {
  optimizeDatabase();
}

module.exports = {
  optimizeDatabase,
  optimizeUserIndexes,
  optimizePostIndexes,
  optimizeProductIndexes,
  optimizeCommentIndexes,
  optimizeOrderIndexes,
  optimizeMessageIndexes,
  optimizeNFTIndexes,
  optimizeFollowIndexes,
  optimizeNotificationIndexes,
  optimizeDAOIndexes,
  optimizeProposalIndexes
};
