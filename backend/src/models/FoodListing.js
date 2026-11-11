import mongoose from 'mongoose';

// ─── Embedded FoodItem subdocument ──────────
const foodItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Food item name is required'],
    trim: true,
    maxlength: [100, 'Name must be at most 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['COOKED_FOOD', 'BAKERY', 'PACKAGED_FOOD', 'FRUITS_VEGETABLES', 'DAIRY', 'BEVERAGES', 'OTHER'],
      message: 'Category must be one of: COOKED_FOOD, BAKERY, PACKAGED_FOOD, FRUITS_VEGETABLES, DAIRY, BEVERAGES, OTHER'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.1, 'Quantity must be greater than 0']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true,
    enum: {
      values: ['kg', 'g', 'litre', 'ml', 'pieces', 'plates', 'packets', 'boxes', 'servings'],
      message: 'Unit must be one of: kg, g, litre, ml, pieces, plates, packets, boxes, servings'
    }
  },
  foodType: {
    type: String,
    required: [true, 'Food type is required'],
    enum: {
      values: ['VEG', 'NON_VEG'],
      message: 'Food type must be VEG or NON_VEG'
    },
    default: 'VEG'
  },
  preparedAt: {
    type: Date
  },
  bestBefore: {
    type: Date
  },
  allergens: [{
    type: String,
    trim: true
  }],
  dietaryInfo: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must be at most 500 characters']
  },
  photoUrl: {
    type: String,
    trim: true
  }
});

// ─── Main FoodListing schema ────────────────
const foodListingSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider ID is required']
  },
  title: {
    type: String,
    required: [true, 'Listing title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [150, 'Title must be at most 150 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description must be at most 1000 characters']
  },
  foodItems: {
    type: [foodItemSchema],
    validate: {
      validator: (items) => items.length > 0,
      message: 'At least one food item is required'
    }
  },

  // ── Pricing ──
  priceType: {
    type: String,
    required: [true, 'Price type is required'],
    enum: {
      values: ['FREE', 'ONE_THIRD', 'HALF', 'CUSTOM'],
      message: 'Price type must be one of: FREE, ONE_THIRD, HALF, CUSTOM'
    },
    default: 'FREE'
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },

  // ── Pickup details ──
  pickupAddress: {
    type: String,
    required: [true, 'Pickup address is required'],
    trim: true
  },
  pickupCity: {
    type: String,
    trim: true
  },
  pickupState: {
    type: String,
    trim: true
  },
  pickupPincode: {
    type: String,
    trim: true
  },
  pickupLat: {
    type: Number
  },
  pickupLng: {
    type: Number
  },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },
  pickupInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Pickup instructions must be at most 500 characters']
  },

  // ── Availability ──
  availableFrom: {
    type: Date,
    required: [true, 'Available-from time is required']
  },
  pickupDeadline: {
    type: Date,
    required: [true, 'Pickup deadline is required']
  },

  // ── Status ──
  status: {
    type: String,
    default: 'AVAILABLE',
    enum: {
      values: ['AVAILABLE', 'CLAIMED', 'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
      message: 'Invalid status value'
    }
  },

  // ── Photo ──
  photoUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// ─── GeoJSON Sync Hook ──────────────────────
foodListingSchema.pre('save', function syncGeoLocation(next) {
  const lat = Number(this.pickupLat);
  const lng = Number(this.pickupLng);
  if (
    this.pickupLat !== undefined && this.pickupLat !== null &&
    this.pickupLng !== undefined && this.pickupLng !== null &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    (lat !== 0 || lng !== 0)
  ) {
    this.location = {
      type: 'Point',
      coordinates: [lng, lat]
    };
  } else if (!this.location || !Array.isArray(this.location.coordinates) || this.location.coordinates.length < 2) {
    this.location = undefined;
  }
  next();
});

// ─── Indexes ────────────────────────────────
foodListingSchema.index({ providerId: 1 });
foodListingSchema.index({ status: 1 });
foodListingSchema.index({ availableFrom: 1 });
foodListingSchema.index({ pickupDeadline: 1 });
foodListingSchema.index({ priceType: 1 });
foodListingSchema.index({ 'foodItems.category': 1 });
foodListingSchema.index({ 'foodItems.foodType': 1 });
foodListingSchema.index({ location: '2dsphere' });

const FoodListing = mongoose.model('FoodListing', foodListingSchema);

export default FoodListing;
