const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    // Ensure you read your Mongo URI from env vars
    const MONGODB_URI = process.env.MONGODB_URI || config.database.uri || 'mongodb://localhost:27017/talkcart';
    
    // Optional: mongoose options
    const mongooseOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 0, // No timeout for server selection
      socketTimeoutMS: 0, // No timeout for socket operations
      // any other options you need
    };
    
    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);

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
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await mongoose.connection.close();
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