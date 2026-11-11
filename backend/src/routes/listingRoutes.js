import { Router } from 'express';
import { body } from 'express-validator';
import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  getMyListings
} from '../controllers/listingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// ─── Validation Rules ───────────────────────

const foodItemValidation = [
  body('foodItems')
    .isArray({ min: 1 })
    .withMessage('At least one food item is required'),
  body('foodItems.*.name')
    .trim()
    .notEmpty()
    .withMessage('Each food item must have a name'),
  body('foodItems.*.category')
    .isIn(['COOKED_FOOD', 'BAKERY', 'PACKAGED_FOOD', 'FRUITS_VEGETABLES', 'DAIRY', 'BEVERAGES', 'OTHER'])
    .withMessage('Invalid food category'),
  body('foodItems.*.quantity')
    .isFloat({ min: 0.1 })
    .withMessage('Quantity must be a positive number'),
  body('foodItems.*.unit')
    .isIn(['kg', 'g', 'litre', 'ml', 'pieces', 'plates', 'packets', 'boxes', 'servings'])
    .withMessage('Invalid unit'),
  body('foodItems.*.foodType')
    .isIn(['VEG', 'NON_VEG'])
    .withMessage('Food type must be VEG or NON_VEG'),
  body('foodItems.*.preparedAt')
    .optional()
    .isISO8601()
    .withMessage('preparedAt must be a valid date'),
  body('foodItems.*.bestBefore')
    .optional()
    .isISO8601()
    .withMessage('bestBefore must be a valid date'),
  body('foodItems.*.allergens')
    .optional()
    .isArray()
    .withMessage('Allergens must be an array'),
  body('foodItems.*.dietaryInfo')
    .optional()
    .isArray()
    .withMessage('Dietary info must be an array'),
  body('foodItems.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Item description must be at most 500 characters'),
  body('foodItems.*.photoUrl')
    .optional()
    .trim()
];

const createListingValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Title must be between 3 and 150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),
  body('priceType')
    .isIn(['FREE', 'ONE_THIRD', 'HALF', 'CUSTOM'])
    .withMessage('Price type must be one of: FREE, ONE_THIRD, HALF, CUSTOM'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('pickupAddress')
    .trim()
    .notEmpty()
    .withMessage('Pickup address is required'),
  body('pickupCity')
    .optional()
    .trim(),
  body('pickupState')
    .optional()
    .trim(),
  body('pickupPincode')
    .optional()
    .trim(),
  body('pickupLat')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('pickupLng')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('latitude')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('pickupInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Pickup instructions must be at most 500 characters'),
  body('availableFrom')
    .isISO8601()
    .withMessage('Available-from must be a valid ISO 8601 date'),
  body('pickupDeadline')
    .isISO8601()
    .withMessage('Pickup deadline must be a valid ISO 8601 date'),
  body('photoUrl')
    .optional()
    .trim(),
  ...foodItemValidation
];

const updateListingValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Title must be between 3 and 150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters'),
  body('priceType')
    .optional()
    .isIn(['FREE', 'ONE_THIRD', 'HALF', 'CUSTOM'])
    .withMessage('Price type must be one of: FREE, ONE_THIRD, HALF, CUSTOM'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('pickupAddress')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Pickup address cannot be empty'),
  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Available-from must be a valid ISO 8601 date'),
  body('pickupDeadline')
    .optional()
    .isISO8601()
    .withMessage('Pickup deadline must be a valid ISO 8601 date'),
  body('foodItems')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one food item is required'),
  body('foodItems.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Each food item must have a name'),
  body('foodItems.*.category')
    .optional()
    .isIn(['COOKED_FOOD', 'BAKERY', 'PACKAGED_FOOD', 'FRUITS_VEGETABLES', 'DAIRY', 'BEVERAGES', 'OTHER'])
    .withMessage('Invalid food category'),
  body('foodItems.*.quantity')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Quantity must be a positive number'),
  body('foodItems.*.unit')
    .optional()
    .isIn(['kg', 'g', 'litre', 'ml', 'pieces', 'plates', 'packets', 'boxes', 'servings'])
    .withMessage('Invalid unit'),
  body('foodItems.*.foodType')
    .optional()
    .isIn(['VEG', 'NON_VEG'])
    .withMessage('Food type must be VEG or NON_VEG')
];

// ─── Routes ─────────────────────────────────

// Public — browse available listings (with filters)
router.get('/', getListings);

// Public — get a single listing
router.get('/:id', getListing);

// Protected + Provider-only — provider's own listings
router.get('/my/listings', protect, authorize('FOOD_PROVIDER', 'ADMIN'), getMyListings);

// Protected + Provider-only — create listing
router.post('/', protect, authorize('FOOD_PROVIDER'), createListingValidation, createListing);

// Protected + Provider-only — update own listing
router.put('/:id', protect, authorize('FOOD_PROVIDER', 'ADMIN'), updateListingValidation, updateListing);

// Protected + Provider-only — cancel/delete own listing
router.delete('/:id', protect, authorize('FOOD_PROVIDER', 'ADMIN'), deleteListing);

export default router;
