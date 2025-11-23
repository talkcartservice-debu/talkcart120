const mongoose = require('mongoose');
const { LiquidityPool, LendingPool, YieldFarm } = require('../models/DeFi');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Initialize DeFi collections only (no mock data)
const initDefiCollections = async () => {
  try {
    console.log('🚀 Initializing DeFi collections...');

    // Just ensure collections exist - no mock data
    try {
      await LiquidityPool.createCollection();
      await LendingPool.createCollection();
      await YieldFarm.createCollection();
      
      console.log('✅ DeFi collections initialized');
      console.log('📋 Ready for real DeFi data from Web3 providers');
      
    } catch (error) {
      if (error.code !== 48) { // Collection already exists error
        throw error;
      }
      console.log('✅ DeFi collections already exist');
    }

    // Show current state
    const liquidityPoolCount = await LiquidityPool.countDocuments();
    const lendingPoolCount = await LendingPool.countDocuments();
    const yieldFarmCount = await YieldFarm.countDocuments();

    console.log('📊 Current DeFi Collections State:');
    console.log(`   🏊 Liquidity Pools: ${liquidityPoolCount}`);
    console.log(`   🏦 Lending Pools: ${lendingPoolCount}`);
    console.log(`   🚜 Yield Farms: ${yieldFarmCount}`);
    console.log('');
    console.log('💡 All DeFi data will be fetched from real Web3 providers');

  } catch (error) {
    console.error('❌ Error initializing DeFi collections:', error);
  }
};

// Run initialization
const runInit = async () => {
  await connectDB();
  await initDefiCollections();
  await mongoose.connection.close();
  console.log('🔌 Database connection closed');
  process.exit(0);
};

// Check if this script is being run directly
if (require.main === module) {
  runInit();
}

module.exports = { initDefiCollections };