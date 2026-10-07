import { Router } from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All notification routes are protected
router.get('/', protect, getMyNotifications);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, markAsRead);

export default router;
