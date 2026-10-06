import { validationResult } from 'express-validator';
import FoodListing from '../models/FoodListing.js';
import { calculateHaversineDistance } from '../utils/distance.js';

// ─────────────────────────────────────────────
// POST /api/listings — Create a food listing
// ─────────────────────────────────────────────
export const createListing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }

    const {
      title, description, foodItems,
      priceType, price,
      pickupAddress, pickupCity, pickupState, pickupPincode,
      pickupLat, pickupLng, pickupInstructions,
      availableFrom, pickupDeadline, photoUrl
    } = req.body;

    // Validate pickupDeadline is after availableFrom
    if (new Date(pickupDeadline) <= new Date(availableFrom)) {
      return res.status(400).json({
        status: 'error',
        message: 'Pickup deadline must be after the available-from time'
      });
    }

    // CUSTOM priceType requires a positive price
    if (priceType === 'CUSTOM' && (!price || price <= 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'A positive price is required when price type is CUSTOM'
      });
    }

    const listing = await FoodListing.create({
      providerId: req.user._id,
      title,
      description,
      foodItems,
      priceType: priceType || 'FREE',
      price: priceType === 'FREE' ? 0 : (price || 0),
      pickupAddress,
      pickupCity,
      pickupState,
      pickupPincode,
      pickupLat,
      pickupLng,
      pickupInstructions,
      availableFrom,
      pickupDeadline,
      photoUrl
    });

    // Populate provider info for the response
    await listing.populate('providerId', 'name email phone');

    res.status(201).json({
      status: 'success',
      message: 'Food listing created successfully',
      data: { listing }
    });
  } catch (error) {
    console.error('Create listing error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the food listing'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/listings — Get all available listings
//   Supports: ?category, ?foodType, ?priceType,
//             ?status, ?city, ?page, ?limit, ?sort
// ─────────────────────────────────────────────
export const getListings = async (req, res) => {
  try {
    const {
      category, foodType, priceType,
      status, city, lat, lng, maxDistance, sortByDistance,
      page = 1, limit = 20, sort = '-createdAt'
    } = req.query;

    const filter = {};

    // By default show only AVAILABLE listings (unless explicit status filter)
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'AVAILABLE';
    }

    // Filter by food item category
    if (category) {
      filter['foodItems.category'] = category;
    }

    // Filter by food type (VEG / NON_VEG)
    if (foodType) {
      filter['foodItems.foodType'] = foodType;
    }

    // Filter by price type
    if (priceType) {
      filter.priceType = priceType;
    }

    // Filter by pickup city
    if (city) {
      filter.pickupCity = { $regex: city, $options: 'i' };
    }

    // Only show listings whose deadline hasn't passed
    filter.pickupDeadline = { $gt: new Date() };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    // Fetch listings
    let listings = await FoodListing.find(filter)
      .populate('providerId', 'name email phone')
      .sort(sort)
      .lean();

    // Calculate distance if coordinates provided
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const hasCoordinates = !isNaN(userLat) && !isNaN(userLng);

    if (hasCoordinates) {
      listings = listings.map(l => {
        let dist = null;
        if (l.pickupLat !== undefined && l.pickupLng !== undefined) {
          dist = calculateHaversineDistance(userLat, userLng, l.pickupLat, l.pickupLng);
        }
        return { ...l, distance: dist };
      });

      // Filter by maxDistance if specified
      if (maxDistance !== undefined && !isNaN(parseFloat(maxDistance))) {
        const maxDistKm = parseFloat(maxDistance);
        listings = listings.filter(l => l.distance !== null && l.distance <= maxDistKm);
      }

      // Sort by distance if requested
      if (sortByDistance === 'true') {
        listings.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }
    }

    const total = listings.length;
    const paginatedListings = listings.slice(skip, skip + limitNum);

    res.status(200).json({
      status: 'success',
      results: paginatedListings.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total
      },
      data: { listings: paginatedListings }
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching food listings'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/listings/:id — Get a single listing
// ─────────────────────────────────────────────
export const getListing = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid listing ID format'
      });
    }

    const listing = await FoodListing.findById(req.params.id)
      .populate('providerId', 'name email phone');

    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Food listing not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { listing }
    });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the food listing'
    });
  }
};

// ─────────────────────────────────────────────
// PUT /api/listings/:id — Update own listing
// ─────────────────────────────────────────────
export const updateListing = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid listing ID format'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }

    const listing = await FoodListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Food listing not found'
      });
    }

    // Only the owner can update
    if (listing.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own listings'
      });
    }

    // Cannot update if already claimed or further along
    const nonEditableStatuses = ['CLAIMED', 'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'COMPLETED'];
    if (nonEditableStatuses.includes(listing.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot update a listing with status '${listing.status}'`
      });
    }

    // Allowlisted update fields
    const allowedFields = [
      'title', 'description', 'foodItems',
      'priceType', 'price',
      'pickupAddress', 'pickupCity', 'pickupState', 'pickupPincode',
      'pickupLat', 'pickupLng', 'pickupInstructions',
      'availableFrom', 'pickupDeadline', 'photoUrl'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    }

    // Re-validate date order if both dates are present
    if (listing.pickupDeadline <= listing.availableFrom) {
      return res.status(400).json({
        status: 'error',
        message: 'Pickup deadline must be after the available-from time'
      });
    }

    await listing.save();
    await listing.populate('providerId', 'name email phone');

    res.status(200).json({
      status: 'success',
      message: 'Food listing updated successfully',
      data: { listing }
    });
  } catch (error) {
    console.error('Update listing error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the food listing'
    });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/listings/:id — Cancel / delete own listing
// ─────────────────────────────────────────────
export const deleteListing = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid listing ID format'
      });
    }

    const listing = await FoodListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Food listing not found'
      });
    }

    // Only the owner (or ADMIN) can delete
    if (
      listing.providerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only cancel your own listings'
      });
    }

    // If already in a downstream state, soft-cancel instead of hard delete
    const activeStatuses = ['CLAIMED', 'CONFIRMED', 'PICKUP_ASSIGNED'];
    if (activeStatuses.includes(listing.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete a listing with status '${listing.status}'. It has already been claimed or is in progress.`
      });
    }

    // Soft cancel — set status to CANCELLED
    listing.status = 'CANCELLED';
    await listing.save();

    res.status(200).json({
      status: 'success',
      message: 'Food listing cancelled successfully',
      data: { listing }
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while cancelling the food listing'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/listings/my — Provider's own listings
// ─────────────────────────────────────────────
export const getMyListings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const filter = { providerId: req.user._id };

    if (status) {
      filter.status = status;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      FoodListing.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FoodListing.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      results: listings.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total
      },
      data: { listings }
    });
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your listings'
    });
  }
};
