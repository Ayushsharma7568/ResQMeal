import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'provider@dontwasteit.demo' }).select('+password');
    console.log('User found:', user ? user.email : 'Not found');
    if (user) {
      console.log('Password hash exists:', !!user.password);
      const isMatch = await user.comparePassword('Demo@123');
      console.log('Password match:', isMatch);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
};

test();
