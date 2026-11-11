import { Router } from 'express';
import { getImpactAnalytics } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Protected role-based analytics endpoint (ADMIN or FOOD_PROVIDER)
router.get('/impact', protect, authorize('ADMIN', 'FOOD_PROVIDER'), getImpactAnalytics);

export default router;

