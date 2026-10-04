import mongoose from 'mongoose';

const pickupRequestSchema = new mongoose.Schema({
  foodClaimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodClaim',
    required: true,
    unique: true
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    default: 'PENDING',
    enum: ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']
  },
  scheduledAt: {
    type: Date
  },
  acceptedAt: {
    type: Date
  },
  pickupStartedAt: {
    type: Date
  },
  pickupCompletedAt: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
pickupRequestSchema.index({ foodClaimId: 1 });
pickupRequestSchema.index({ volunteerId: 1 });
pickupRequestSchema.index({ status: 1 });

const PickupRequest = mongoose.model('PickupRequest', pickupRequestSchema);

export default PickupRequest;
