import mongoose from 'mongoose';

const impactMetricSchema = new mongoose.Schema({
  totalRescues: {
    type: Number,
    default: 0
  },
  totalMealsServed: {
    type: Number,
    default: 0
  },
  totalKgRescued: {
    type: Number,
    default: 0
  },
  totalProviders: {
    type: Number,
    default: 0
  },
  totalSeekers: {
    type: Number,
    default: 0
  },
  totalVolunteers: {
    type: Number,
    default: 0
  },
  co2SavedKg: {
    type: Number,
    default: 0
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
impactMetricSchema.index({ calculatedAt: 1 });

const ImpactMetric = mongoose.model('ImpactMetric', impactMetricSchema);

export default ImpactMetric;
