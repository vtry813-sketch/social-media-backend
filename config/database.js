const mongoose = require('mongoose');
const redis = require('redis');

// MongoDB Connection
const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error; // Let the caller handle the error
  }
};

// Redis Connection
let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Connected');
    });

    await redisClient.connect();
  } catch (error) {
    console.error('Redis connection error:', error);
    // Don't exit process if Redis fails, just log the error
  }
};

const getRedisClient = () => {
  return redisClient;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');

  if (redisClient) {
    await redisClient.quit();
  }

  await mongoose.connection.close();
  process.exit(0);
});

module.exports = {
  connectMongoDB,
  connectRedis,
  getRedisClient
};