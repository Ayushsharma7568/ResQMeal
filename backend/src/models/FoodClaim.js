import mongoose from 'mongoose';

const foodClaimSchema = new mongoose.Schema({
  foodListingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodListing',
    required: [true, 'Food listing ID is required']
  },
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seeker ID is required']
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider ID is required']
  },
  status: {
    type: String,
    enum: {
      values: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
      message: 'Status must be PENDING, APPROVED, REJECTED, CANCELLED, or COMPLETED'
    },
    default: 'PENDING'
  },
  requestedPickupTime: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes must be at most 500 characters']
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason must be at most 500 characters']
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for fast lookup
foodClaimSchema.index({ foodListingId: 1 });
foodClaimSchema.index({ seekerId: 1 });
foodClaimSchema.index({ providerId: 1 });
foodClaimSchema.index({ status: 1 });
// Compound index to quickly find active claim per seeker per listing
foodClaimSchema.index({ foodListingId: 1, seekerId: 1, status: 1 });

const FoodClaim = mongoose.model('FoodClaim', foodClaimSchema);

export default FoodClaim;
