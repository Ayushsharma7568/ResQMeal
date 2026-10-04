import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
  foodClaimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodClaim',
    required: [true, 'Food claim ID is required'],
    unique: true
  },
  foodListingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodListing',
    required: [true, 'Food listing ID is required']
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider ID is required']
  },
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seeker ID is required']
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'RECEIVED', 'COMPLETED', 'CANCELLED'],
      message: 'Status must be UNASSIGNED, ASSIGNED, PICKED_UP, DELIVERED, RECEIVED, COMPLETED, or CANCELLED'
    },
    default: 'UNASSIGNED'
  },
  pickupAddress: {
    type: String,
    required: [true, 'Pickup address is required'],
    trim: true
  },
  deliveryAddress: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes must be at most 500 characters']
  },
  proofOfDelivery: {
    type: String,
    trim: true
  },
  acceptedAt: {
    type: Date
  },
  pickedUpAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  receivedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes (foodClaimId index is already created by unique: true)
deliverySchema.index({ foodListingId: 1 });
deliverySchema.index({ volunteerId: 1 });
deliverySchema.index({ seekerId: 1 });
deliverySchema.index({ providerId: 1 });
deliverySchema.index({ status: 1 });

const Delivery = mongoose.model('Delivery', deliverySchema);

export default Delivery;
