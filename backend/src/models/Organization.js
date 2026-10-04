import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['RESTAURANT', 'HOTEL', 'HOSTEL', 'CANTEEN', 'NGO', 'CHARITY', 'COMMUNITY_CENTER', 'OTHER']
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
organizationSchema.index({ userId: 1 });
organizationSchema.index({ isVerified: 1 });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
