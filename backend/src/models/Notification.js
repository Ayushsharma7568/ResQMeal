import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient ID is required']
  },
  type: {
    type: String,
    enum: {
      values: [
        'CLAIM_SUBMITTED',
        'CLAIM_APPROVED',
        'CLAIM_REJECTED',
        'DELIVERY_ASSIGNED',
        'FOOD_PICKED_UP',
        'FOOD_DELIVERED',
        'RECEIPT_REMINDER',
        'NEW_LISTING_NEARBY',
        'DEADLINE_APPROACHING',
        'SYSTEM_ALERT'
      ],
      message: 'Invalid notification type'
    },
    required: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true
  },
  relatedEntityType: {
    type: String,
    enum: ['FoodListing', 'FoodClaim', 'Delivery', 'User']
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for fast retrieval of unread notifications per user
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
