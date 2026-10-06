import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { 
  parseListing, 
  getRecommendations, 
  getInsights, 
  queryAnalytics 
} from '../controllers/aiController.js';

const router = express.Router();

// POST /api/ai/parse-listing — Providers parse raw text into food listing format
router.post('/parse-listing', protect, authorize('FOOD_PROVIDER', 'ADMIN'), parseListing);

// GET /api/ai/recommendations — Seekers get smart matching scores on available food
router.get('/recommendations', protect, authorize('FOOD_SEEKER', 'ADMIN'), getRecommendations);

// GET /api/ai/insights — Platform surplus demand insights
router.get('/insights', protect, getInsights);

// POST /api/ai/admin-query — Admin AI analytics assistant
router.post('/admin-query', protect, authorize('ADMIN'), queryAnalytics);

export default router;
