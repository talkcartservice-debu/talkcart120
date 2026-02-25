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
    const sanitizedURI = MONGODB_URI.replace(/\/\/.*@/, '//****:****@');
    console.log('🔧 Database: Using MONGODB_URI:', sanitizedURI);
    console.log('🔧 Database: Full MONGODB_URI length:', MONGODB_URI.length);
    console.log('🔧 Database: MONGODB_URI starts with:', MONGODB_URI.substring(0, Math.min(50, MONGODB_URI.length)) + (MONGODB_URI.length > 50 ? '...' : ''));
    
    // Debug the URI components
    if (MONGODB_URI) {
      console.log('🔧 Database: URI scheme:', MONGODB_URI.split(':')[0]);
      console.log('🔧 Database: URI has +srv:', MONGODB_URI.includes('+srv'));
      console.log('🔧 Database: URI has credentials separator (@):', MONGODB_URI.includes('@'));
      console.log('🔧 Database: URI has query parameters (?):', MONGODB_URI.includes('?'));
      
      // Check for hidden whitespace or control characters
      const hasWhitespace = /\s/.test(MONGODB_URI);
      console.log('🔧 Database: URI has whitespace:', hasWhitespace);
      if (hasWhitespace) {
        console.warn('⚠️ WARNING: MONGODB_URI contains whitespace characters!');
      }
      
      // Check for quotes that might be accidentally included in env vars
      const hasQuotes = MONGODB_URI.includes('"') || MONGODB_URI.includes("'");
      console.log('🔧 Database: URI has quotes:', hasQuotes);
      if (hasQuotes) {
        console.warn('⚠️ WARNING: MONGODB_URI contains quote characters!');
      }
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
    if (process.env.NODE_ENV === 'production' || error.name === 'MongooseServerSelectionError') {
      console.error('🔧 MONGODB CONNECTION TROUBLESHOOTING:');
      console.error('   1. IP WHITELIST (Most Common): In MongoDB Atlas, go to "Network Access" and add "0.0.0.0/0"');
      console.error('      Wait 1-2 minutes for the changes to apply in Atlas before restarting Render.');
      console.error('   2. RENDER ENV VARS: Ensure MONGODB_URI is set in "Environment" tab of your Render service.');
      console.error('      Make sure there are no spaces or quotes around the URI.');
      console.error('   3. PASSWORD: If your password has special characters (like !), ensure they are URL-encoded.');
      console.error('      In your case, "!!" should be "%21%21"');
    } else {
      console.error('Check your MONGODB_URI in the .env file');
    }
    
    // Throw error instead of exiting so it can be handled by calling function
    throw error;
  }
};

module.exports = connectDB;