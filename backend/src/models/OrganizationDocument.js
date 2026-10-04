import mongoose from 'mongoose';

const organizationDocumentSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  documentType: {
    type: String,
    required: true,
    trim: true
  },
  documentUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'PENDING',
    enum: ['PENDING', 'VERIFIED', 'REJECTED']
  },
  rejectionReason: {
    type: String
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
organizationDocumentSchema.index({ organizationId: 1 });
organizationDocumentSchema.index({ status: 1 });

const OrganizationDocument = mongoose.model('OrganizationDocument', organizationDocumentSchema);

export default OrganizationDocument;
