import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './src/models/User.js';
import FoodListing from './src/models/FoodListing.js';

// Resolve environment file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dontwasteit';

export const demoUsers = [
  { name: 'Demo Provider', email: 'provider@dontwasteit.demo', phone: '9876543210', password: 'Demo@123', role: 'FOOD_PROVIDER', isActive: true },
  { name: 'Demo Seeker', email: 'seeker@dontwasteit.demo', phone: '9876543211', password: 'Demo@123', role: 'FOOD_SEEKER', isActive: true },
  { name: 'Demo Volunteer', email: 'volunteer@dontwasteit.demo', phone: '9876543212', password: 'Demo@123', role: 'VOLUNTEER', isActive: true },
  { name: 'Demo Admin', email: 'admin@dontwasteit.demo', phone: '9876543213', password: 'Demo@123', role: 'ADMIN', isActive: true }
];

export const getBangaloreMockListings = (providerId) => {
  const now = new Date();
  const availableFrom = new Date(now.getTime() - 30 * 60 * 1000); // 30 mins ago
  const deadline1 = new Date(now.getTime() + 8 * 3600 * 1000);   // +8 hours
  const deadline2 = new Date(now.getTime() + 18 * 3600 * 1000);  // +18 hours
  const deadline3 = new Date(now.getTime() + 6 * 3600 * 1000);   // +6 hours

  return [
    {
      providerId,
      title: 'Fresh Veggie Meals (Surplus)',
      description: 'Wholesome freshly prepared mixed vegetable meals, lentils, and chapati from community kitchen surplus.',
      foodItems: [
        {
          name: 'Fresh Veggie Meals',
          category: 'COOKED_FOOD',
          quantity: 25,
          unit: 'servings',
          foodType: 'VEG',
          description: 'Steamed rice, dal tadka, seasonal vegetable subzi, and soft rotis',
          preparedAt: new Date(now.getTime() - 2 * 3600 * 1000),
          bestBefore: deadline1
        }
      ],
      priceType: 'FREE',
      price: 0,
      pickupAddress: '80 Feet Road, 4th Block, Koramangala',
      pickupCity: 'Bangalore',
      pickupState: 'Karnataka',
      pickupPincode: '560034',
      pickupLat: 12.9352,
      pickupLng: 77.6245,
      pickupInstructions: 'Pick up from side entrance catering counter. Mention DontWasteIt app ID.',
      availableFrom,
      pickupDeadline: deadline1,
      status: 'AVAILABLE'
    },
    {
      providerId,
      title: 'Bakery Bread and Pastries',
      description: 'Daily fresh bakery surplus including artisan sourdough loaves, baguettes, and assorted puff pastries.',
      foodItems: [
        {
          name: 'Artisan Bread and Pastries',
          category: 'BAKERY',
          quantity: 10,
          unit: 'pieces',
          foodType: 'VEG',
          description: 'Whole wheat artisan sourdough loaves and fresh breakfast croissants',
          preparedAt: new Date(now.getTime() - 3 * 3600 * 1000),
          bestBefore: deadline2
        }
      ],
      priceType: 'FREE',
      price: 0,
      pickupAddress: '100 Feet Road, HAL 2nd Stage, Indiranagar',
      pickupCity: 'Bangalore',
      pickupState: 'Karnataka',
      pickupPincode: '560038',
      pickupLat: 12.9784,
      pickupLng: 77.6408,
      pickupInstructions: 'Collect at the bakery dispatch dock. Ask for store manager.',
      availableFrom,
      pickupDeadline: deadline2,
      status: 'AVAILABLE'
    },
    {
      providerId,
      title: 'Packed Rice and Dal Combo',
      description: 'Hygienically packaged warm lunch combos containing jeera rice and dal tadka in meal containers.',
      foodItems: [
        {
          name: 'Rice and Dal Combo Packets',
          category: 'COOKED_FOOD',
          quantity: 40,
          unit: 'packets',
          foodType: 'VEG',
          description: 'Individual heat-sealed meal trays of jeera rice and yellow dal tadka',
          preparedAt: new Date(now.getTime() - 1 * 3600 * 1000),
          bestBefore: deadline3
        }
      ],
      priceType: 'FREE',
      price: 0,
      pickupAddress: 'Mahatma Gandhi Road, Near MG Road Metro Station',
      pickupCity: 'Bangalore',
      pickupState: 'Karnataka',
      pickupPincode: '560001',
      pickupLat: 12.9756,
      pickupLng: 77.6066,
      pickupInstructions: 'Pick up at the pantry distribution area on ground floor.',
      availableFrom,
      pickupDeadline: deadline3,
      status: 'AVAILABLE'
    }
  ];
};

export const seedUsers = async () => {
  let seededCount = 0;
  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create(u);
      seededCount++;
    }
  }
  return seededCount;
};

export const seedFoodListings = async () => {
  const provider = await User.findOne({ email: 'provider@dontwasteit.demo' });
  if (!provider) {
    console.warn('⚠️ Demo provider account not found. Ensuring demo users are seeded...');
    await seedUsers();
  }
  const verifiedProvider = await User.findOne({ email: 'provider@dontwasteit.demo' });
  if (!verifiedProvider) {
    console.error('❌ Could not find demo provider account.');
    return 0;
  }

  const existingCount = await FoodListing.countDocuments();
  console.log(`🔍 Checking FoodListing collection: currently contains ${existingCount} listing(s).`);

  const mockListings = getBangaloreMockListings(verifiedProvider._id);
  let seededCount = 0;

  for (const mock of mockListings) {
    const existing = await FoodListing.findOne({ title: mock.title });
    if (!existing) {
      await FoodListing.create(mock);
      seededCount++;
      console.log(`  + Seeded listing: "${mock.title}" at ${mock.pickupCity} (${mock.foodItems[0].quantity} ${mock.foodItems[0].unit})`);
    } else {
      let updated = false;
      if (!existing.providerId || existing.providerId.toString() !== verifiedProvider._id.toString()) {
        existing.providerId = verifiedProvider._id;
        updated = true;
      }
      if (existing.pickupDeadline <= new Date()) {
        existing.availableFrom = mock.availableFrom;
        existing.pickupDeadline = mock.pickupDeadline;
        existing.status = 'AVAILABLE';
        updated = true;
      }
      if (updated) {
        await existing.save();
        console.log(`  ↻ Refreshed existing listing: "${mock.title}"`);
      }
    }
  }

  const finalCount = await FoodListing.countDocuments();
  console.log(`🌱 Food listings check complete. ${seededCount} new listing(s) inserted. Total listings: ${finalCount}`);
  return seededCount;
};

const run = async () => {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000
    });
    console.log(`✅ Connected to MongoDB (${mongoose.connection.host})`);

    const userCount = await seedUsers();
    console.log(`🌱 User seeding complete: ${userCount} new demo user(s) created.`);

    const listingCount = await seedFoodListings();
    console.log(`🌱 Food listing seeding complete: ${listingCount} new Bangalore listing(s) created.`);

    // Verify
    const allUsers = await User.find({ email: { $in: demoUsers.map(d => d.email) } });
    console.log(`Verified ${allUsers.length}/${demoUsers.length} demo accounts in database.`);

    const sampleListings = await FoodListing.find({
      title: { $in: ['Fresh Veggie Meals (Surplus)', 'Bakery Bread and Pastries', 'Packed Rice and Dal Combo'] }
    });
    console.log(`Verified ${sampleListings.length}/3 Bangalore sample listings in database.`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

// Execute if run directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  run();
}
