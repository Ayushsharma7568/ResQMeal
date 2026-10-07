import { Router } from 'express';
import { body } from 'express-validator';
import {
  createDeliveryTask,
  getAvailableTasks,
  acceptTask,
  getMyAssignedTasks,
  getMySeekerDeliveries,
  markPickedUp,
  markDelivered,
  confirmReceipt,
  getDelivery
} from '../controllers/deliveryController.js';

import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// ─── Validation Rules ───────────────────────

const createDeliveryValidation = [
  body('foodClaimId')
    .isMongoId()
    .withMessage('Valid food claim ID is required'),
  body('deliveryAddress')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be at most 500 characters')
];

const deliveredValidation = [
  body('proofOfDelivery')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be at most 500 characters')
];

// ─── Routes ─────────────────────────────────

// Create delivery task for an APPROVED claim
router.post('/', protect, createDeliveryValidation, createDeliveryTask);

// Volunteer routes
router.get('/available', protect, authorize('VOLUNTEER', 'ADMIN'), getAvailableTasks);
router.get('/my', protect, authorize('VOLUNTEER', 'ADMIN'), getMyAssignedTasks);

// Seeker routes
router.get('/seeker', protect, authorize('FOOD_SEEKER', 'ADMIN'), getMySeekerDeliveries);
router.patch('/:id/confirm-receipt', protect, authorize('FOOD_SEEKER', 'ADMIN'), confirmReceipt);

// Status transition routes
router.patch('/:id/accept', protect, authorize('VOLUNTEER', 'ADMIN'), acceptTask);
router.patch('/:id/picked-up', protect, authorize('VOLUNTEER', 'ADMIN'), markPickedUp);
router.patch('/:id/delivered', protect, authorize('VOLUNTEER', 'ADMIN'), deliveredValidation, markDelivered);

// Single delivery details
router.get('/:id', protect, getDelivery);

export default router;
