const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    console.log('🔧 Database connection attempt starting...');
    console.log('🔧 Process env MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    console.log('🔧 Process env MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);
    console.log('🔧 Process env NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 Process env keys (first 10):', Object.keys(process.env).slice(0, 10).join(', '));
    const MONGODB_URI = process.env.MONGODB_URI || config.database.uri || 'mongodb://localhost:27017/vetora';
    
    // Log the actual URI being used (without credentials)
    console.log('🔧 Database: Using MONGODB_URI:', MONGODB_URI.replace(/\/\/.*@/, '//****:****@'));
    console.log('🔧 Database: Full MONGODB_URI length:', MONGODB_URI.length);
    console.log('🔧 Database: MONGODB_URI starts with:', MONGODB_URI.substring(0, Math.min(50, MONGODB_URI.length)) + (MONGODB_URI.length > 50 ? '...' : ''));
    
    // Debug the URI components
    if (MONGODB_URI) {
      console.log('🔧 Database: URI contains mongodb://', MONGODB_URI.includes('mongodb://'));
      console.log('🔧 Database: URI contains mongodb+srv://', MONGODB_URI.includes('mongodb+srv://'));
      console.log('🔧 Database: URI contains cluster0.oguqwli.mongodb.net', MONGODB_URI.includes('cluster0.oguqwli.mongodb.net'));
      console.log('🔧 Database: URI contains vetoraservice', MONGODB_URI.includes('vetoraservice'));
      
      // Check for special characters
      console.log('🔧 Database: URI contains quotes:', MONGODB_URI.includes('"') || MONGODB_URI.includes("'"));
      console.log('🔧 Database: URI contains encoded quotes:', MONGODB_URI.includes('%22'));
      
      // Show first and last characters
      console.log('🔧 Database: First 10 chars:', MONGODB_URI.substring(0, 10));
      console.log('🔧 Database: Last 10 chars:', MONGODB_URI.substring(MONGODB_URI.length - 10));
    }
    
    // Validate MongoDB URI format
    if (MONGODB_URI && !MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
      console.warn('⚠️ WARNING: MONGODB_URI does not appear to be a valid MongoDB connection string');
      console.warn('⚠️ Expected format: mongodb:// or mongodb+srv://');
    }
    
    // Validate that we have a proper MongoDB URI
    if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017/vetora') {
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ WARNING: Using default localhost MongoDB URI in production! This will not work on Render.');
        console.warn('⚠️ Please set MONGODB_URI environment variable to a cloud MongoDB connection string.');
      }
    }
    
    // Improved mongoose options for Render deployment
    const mongooseOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
      socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      retryWrites: true
    };
    
    console.log('🔧 Mongoose options:', JSON.stringify(mongooseOptions, null, 2));
    
    console.log('Attempting to connect to MongoDB with URI:', MONGODB_URI.replace(/\/\/.*@/, '//****:****@')); // Hide credentials
    
    // Log additional connection details
    console.log('🔧 Database connection details:', {
      hasEnvURI: !!process.env.MONGODB_URI,
      configURI: config.database.uri ? 'SET' : 'NOT SET',
      usingDefault: MONGODB_URI === 'mongodb://localhost:27017/vetora',
      environment: process.env.NODE_ENV,
      uriLength: MONGODB_URI.length
    });
    
    console.log('🔧 Attempting mongoose connection...');
    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('🔧 Mongoose connection successful');
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected - attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through SIGINT');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through SIGTERM');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error('MongoDB connection error code:', error.code);
    console.error('MongoDB connection error name:', error.name);
    console.error('Please ensure MongoDB is running and accessible');
    
    // Provide specific guidance based on environment
    if (process.env.NODE_ENV === 'production') {
      console.error('🔧 PRODUCTION DEPLOYMENT:');
      console.error('   1. Make sure MONGODB_URI is set in Render environment variables');
      console.error('   2. Ensure the MongoDB URI points to a cloud service (not localhost)');
      console.error('   3. Verify MongoDB credentials are correct');
      console.error('   4. Check that your MongoDB service is accessible from Render');
    } else {
      console.error('Check your MONGODB_URI in the .env file');
    }
    
    // Throw error instead of exiting so it can be handled by calling function
    throw error;
  }
};

module.exports = connectDB;