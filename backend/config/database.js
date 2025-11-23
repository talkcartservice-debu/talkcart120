const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    // Ensure you read your Mongo URI from env vars
    const MONGODB_URI = process.env.MONGODB_URI || config.database.uri || 'mongodb://localhost:27017/talkcart';
    
    // Improved mongoose options for Render deployment
    const mongooseOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
      socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      retryWrites: true,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    console.log('Attempting to connect to MongoDB with URI:', MONGODB_URI.replace(/\/\/.*@/, '//****:****@')); // Hide credentials
    
    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
    
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
    console.error('Please ensure MongoDB is running and accessible');
    console.error('Check your MONGODB_URI in the .env file');
    
    // Exit so Render marks it as failed — avoids running in a bad state
    process.exit(1);
  }
};

module.exports = connectDB;