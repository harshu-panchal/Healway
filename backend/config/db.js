const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/healway';

  // Connection options for better reliability
  const options = {
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    connectTimeoutMS: 30000, // 30 seconds
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 5, // Maintain at least 5 socket connections
    retryWrites: true,
    w: 'majority',
    // Enable retry logic
    retryReads: true,
  };

  // Set up connection event handlers
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  // Handle process termination
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  });

  // Attempt connection with retry logic
  let retries = 0;
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  while (retries < maxRetries) {
    try {
      await mongoose.connect(mongoUri, options);
      return; // Success, exit retry loop
    } catch (error) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries}/${maxRetries} failed:`, error.message);

      if (retries < maxRetries) {
        console.log(`⏳ Retrying connection in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ Failed to connect to MongoDB after all retries');
        console.error('Please check:');
        console.error('1. MongoDB server is running');
        console.error('2. Connection string is correct');
        console.error('3. Network connectivity');
        console.error('4. IP whitelist (if using MongoDB Atlas)');
        console.error('5. Firewall settings');
        // Don't exit immediately - allow server to start but log errors
        // process.exit(1);
      }
    }
  }
};

module.exports = connectDB;

