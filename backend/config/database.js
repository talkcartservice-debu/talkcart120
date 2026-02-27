const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    console.log('🔧 Database connection attempt starting...');
    console.log('🔧 Process env MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    console.log('🔧 Process env MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);
    console.log('🔧 Process env NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 Process env keys (first 10):', Object.keys(process.env).slice(0, 10).join(', '));
    let MONGODB_URI = process.env.MONGODB_URI || config.database.uri || 'mongodb://localhost:27017/vetora';
    
    // Sanitize MONGODB_URI: remove leading/trailing whitespace and quotes
    if (typeof MONGODB_URI === 'string') {
      const originalURI = MONGODB_URI;
      MONGODB_URI = MONGODB_URI.trim();
      
      // Remove leading/trailing quotes if present
      if ((MONGODB_URI.startsWith('"') && MONGODB_URI.endsWith('"')) || 
          (MONGODB_URI.startsWith("'") && MONGODB_URI.endsWith("'"))) {
        console.log('🔧 Database: Removing quotes from MONGODB_URI');
        MONGODB_URI = MONGODB_URI.substring(1, MONGODB_URI.length - 1);
      }

      if (originalURI !== MONGODB_URI) {
        console.log('🔧 Database: Sanity check performed on MONGODB_URI');
      }
    }
    
    // Automatically encode special characters in the password if they exist
    if (MONGODB_URI.includes('://') && MONGODB_URI.includes('@')) {
      try {
        const urlParts = MONGODB_URI.split('://');
        const scheme = urlParts[0];
        const remainder = urlParts[1];
        
        const lastAtIndex = remainder.lastIndexOf('@');
        const credentialsPart = remainder.substring(0, lastAtIndex);
        const connectionPart = remainder.substring(lastAtIndex + 1);
        
        if (credentialsPart.includes(':')) {
          const firstColonIndex = credentialsPart.indexOf(':');
          const username = credentialsPart.substring(0, firstColonIndex);
          const password = credentialsPart.substring(firstColonIndex + 1);
          
          // Only encode if it's not already encoded (doesn't contain %)
          // and contains special characters that need encoding
          if (password && !password.includes('%') && /[^a-zA-Z0-9]/.test(password)) {
            console.log('🔧 Database: Automatically encoding special characters in password');
            const encodedPassword = encodeURIComponent(password);
            MONGODB_URI = `${scheme}://${username}:${encodedPassword}@${connectionPart}`;
          }
        }
      } catch (e) {
        console.warn('⚠️ Warning: Failed to automatically encode password in MONGODB_URI', e.message);
      }
    }
    
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
    if (process.env.NODE_ENV === 'production' || 
        error.name === 'MongooseServerSelectionError' || 
        error.name === 'MongoServerError' ||
        error.code === 8000) {
      
      console.error('🔧 MONGODB CONNECTION TROUBLESHOOTING:');
      
      if (error.code === 8000 || error.message.includes('Authentication failed')) {
        console.error('   ❌ AUTHENTICATION FAILED (Code 8000):');
        console.error('   1. USERNAME/PASSWORD: Double check username "nshticedrck" and password in MongoDB Atlas.');
        console.error('   2. SPECIAL CHARACTERS: If your password has "@", ":", "/", "?", or "%", it MUST be URL encoded.');
        console.error('   3. RENDER CONFIG: Go to Render -> Dashboard -> Your Service -> Environment.');
        console.error('      Ensure MONGODB_URI is exactly the string from Atlas, WITHOUT any quotes around it.');
        console.error('   4. DB USER ROLES: In Atlas, go to "Database Access". Ensure "nshticedrck" has "Read and write to any database" or "atlasAdmin" permissions.');
        console.error('   5. DATABASE NAME: Verify "nshtis_org_2026_02" exists in your Atlas cluster.');
      } else if (error.name === 'MongooseServerSelectionError' || error.message.includes('Server selection timed out')) {
        console.error('   ❌ NETWORK/IP WHITELIST ISSUE:');
        console.error('   1. IP WHITELIST: In Atlas -> Network Access, you MUST add "0.0.0.0/0" to allow Render to connect.');
        console.error('   2. RENDER OUTBOUND: Render\'s IP addresses change, so "Allow access from anywhere" is required.');
      }
      
      console.error('   💡 TIP: Copy your MONGODB_URI and try connecting with MongoDB Compass on your local machine first.');
      console.error('      If it works locally but fails on Render, it is almost certainly an IP Whitelist (0.0.0.0/0) issue.');
    } else {
      console.error('Check your MONGODB_URI in the .env file');
    }
    
    // Throw error instead of exiting so it can be handled by calling function
    throw error;
  }
};

module.exports = connectDB;