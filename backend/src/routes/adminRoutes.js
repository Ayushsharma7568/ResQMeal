import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAdminUsers,
  updateAdminUser,
  getAdminListings,
  updateAdminListing,
  getAdminDeliveries,
  getAdminClaims,
  getAdminAnalytics
} from '../controllers/adminController.js';

const router = express.Router();

// Strict Access Control: All admin routes require authentication and ADMIN role
router.use(protect, authorize('ADMIN'));

router.get('/', getAdminUsers);
router.get('/users', getAdminUsers);
router.patch('/users/:id', updateAdminUser);
router.patch('/users/:id/status', updateAdminUser);

router.get('/listings', getAdminListings);
router.patch('/listings/:id', updateAdminListing);
router.patch('/listings/:id/status', updateAdminListing);

router.get('/deliveries', getAdminDeliveries);
router.get('/claims', getAdminClaims);
router.get('/analytics', getAdminAnalytics);

export default router;

