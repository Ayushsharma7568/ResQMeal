import { Router } from 'express';
import { body } from 'express-validator';
import {
  createClaim,
  getMyClaims,
  getIncomingClaims,
  getClaim,
  approveClaim,
  rejectClaim,
  cancelClaim
} from '../controllers/claimController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// ─── Validation Rules ───────────────────────

const createClaimValidation = [
  body('foodListingId')
    .isMongoId()
    .withMessage('Valid food listing ID is required'),
  body('requestedPickupTime')
    .optional()
    .isISO8601()
    .withMessage('requestedPickupTime must be a valid ISO 8601 date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be at most 500 characters')
];

const rejectClaimValidation = [
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be at most 500 characters')
];

// ─── Routes ─────────────────────────────────

// Protected routes for Food Seekers
router.post('/', protect, authorize('FOOD_SEEKER', 'ADMIN'), createClaimValidation, createClaim);
router.get('/my', protect, authorize('FOOD_SEEKER', 'ADMIN'), getMyClaims);

// Protected routes for Food Providers
router.get('/incoming', protect, authorize('FOOD_PROVIDER', 'ADMIN'), getIncomingClaims);
router.patch('/:id/approve', protect, authorize('FOOD_PROVIDER', 'ADMIN'), approveClaim);
router.patch('/:id/reject', protect, authorize('FOOD_PROVIDER', 'ADMIN'), rejectClaimValidation, rejectClaim);

// Protected routes for Seekers/Owners
router.patch('/:id/cancel', protect, authorize('FOOD_SEEKER', 'ADMIN'), cancelClaim);

// Get single claim (Seeker / Provider / Admin)
router.get('/:id', protect, getClaim);

export default router;
