import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAdminUsers,
  getAdminListings,
  getAdminDeliveries,
  getAdminClaims,
  getAdminAnalytics
} from '../controllers/adminController.js';

const router = express.Router();

// Strict Access Control: All admin routes require authentication and ADMIN role
router.use(protect, authorize('ADMIN'));

router.get('/users', getAdminUsers);
router.get('/listings', getAdminListings);
router.get('/deliveries', getAdminDeliveries);
router.get('/claims', getAdminClaims);
router.get('/analytics', getAdminAnalytics);

export default router;
