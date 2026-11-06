import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { seedUsers, seedFoodListings, seedDeliveries } from '../../seed.js';

dotenv.config();

let mongoServer;

const connectDB = async () => {
  try {
    // Connection options to help with DNS issues
    const options = {
      serverSelectionTimeoutMS: 5000, // Reduced to fail faster and fallback
      socketTimeoutMS: 30000
    };

    console.log('⏳ Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Auto-seed demo users, Bangalore food listings, and default unassigned deliveries if not present
    await seedUsers();
    await seedFoodListings();
    await seedDeliveries();
  } catch (error) {
    console.error(`❌ Primary MongoDB Connection Error: ${error.message}`);
    console.log('⚠️ Falling back to in-memory database for development...');
    
    try {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
      console.log('✅ Connected to In-Memory MongoDB');
      
      await seedUsers();
      await seedFoodListings();
      await seedDeliveries();
      console.log('🌱 Demo users, Bangalore mock food listings, and unassigned deliveries seeded successfully.');
    } catch (fallbackError) {
      console.error(`❌ Fallback MongoDB Error: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ Mongoose connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('🛑 MongoDB connection closed through app termination');
  process.exit(0);
});

export default connectDB;
