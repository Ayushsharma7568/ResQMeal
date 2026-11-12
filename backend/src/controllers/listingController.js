import { validationResult } from 'express-validator';
import FoodListing from '../models/FoodListing.js';
import { calculateHaversineDistance } from '../utils/distance.js';
import { resolveListingCoordinates } from '../utils/geocoder.js';
import { emitEvent } from '../config/socket.js';

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
      pickupLat, pickupLng, latitude, longitude, location,
      pickupInstructions, availableFrom, pickupDeadline, photoUrl
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

    // Automatically resolve coordinates via lookup dictionary / Nominatim / Bangalore fallback if missing
    const resolvedCoords = await resolveListingCoordinates({
      pickupLat,
      pickupLng,
      latitude,
      longitude,
      location,
      pickupAddress,
      pickupCity,
      pickupState,
      pickupPincode
    });

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
      pickupLat: resolvedCoords.pickupLat,
      pickupLng: resolvedCoords.pickupLng,
      pickupInstructions,
      availableFrom,
      pickupDeadline,
      expiresAt: pickupDeadline,
      escalationTier: 1,
      isCriticalRescue: false,
      currentRadiusKm: 2,
      photoUrl
    });

    // Populate provider info for the response
    await listing.populate('providerId', 'name email phone');

    // Broadcast real-time listing creation via Socket.io
    emitEvent('listing:created', listing.toObject ? listing.toObject() : listing);

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
      status, city,
      userLat, userLng, radius,
      lat, lng, maxDistance, sortByDistance,
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

    // Only show listings whose deadline hasn't passed (unless querying non-AVAILABLE admin audit logs)
    if (!status || status === 'AVAILABLE') {
      filter.pickupDeadline = { $gt: new Date() };
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    // Support both userLat/userLng (+ radius) and legacy lat/lng (+ maxDistance)
    const rawLat = userLat !== undefined ? userLat : lat;
    const rawLng = userLng !== undefined ? userLng : lng;
    const parsedLat = parseFloat(rawLat);
    const parsedLng = parseFloat(rawLng);
    const hasCoordinates = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

    let listings = [];

    if (hasCoordinates) {
      const parsedRadius = radius !== undefined && radius !== ''
        ? parseFloat(radius)
        : (maxDistance !== undefined && maxDistance !== '' ? parseFloat(maxDistance) : 25);
      const radiusKm = Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : 25;

      try {
        const makeAggPipeline = (maxMeters) => [
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [parsedLng, parsedLat] },
              distanceField: 'distanceMeters',
              ...(maxMeters ? { maxDistance: maxMeters } : {}),
              spherical: true,
              query: filter
            }
          },
          { $sort: { distanceMeters: 1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'providerId',
              foreignField: '_id',
              as: 'providerInfo'
            }
          },
          {
            $addFields: {
              providerId: {
                $let: {
                  vars: { prov: { $arrayElemAt: ['$providerInfo', 0] } },
                  in: {
                    _id: '$$prov._id',
                    name: '$$prov.name',
                    email: '$$prov.email',
                    phone: '$$prov.phone'
                  }
                }
              },
              distance: {
                $round: [{ $divide: ['$distanceMeters', 1000] }, 1]
              }
            }
          },
          { $project: { providerInfo: 0, distanceMeters: 0 } }
        ];

        // Query with requested radius first
        listings = await FoodListing.aggregate(makeAggPipeline(radiusKm * 1000));

        // Fallback: If 0 listings matched within radius, do NOT strictly drop listings;
        // query all active listings sorted nearest first so listings and Leaflet map pins do not vanish!
        if (listings.length === 0) {
          listings = await FoodListing.aggregate(makeAggPipeline(null));
        }
      } catch (geoErr) {
        // Fallback to Haversine calculation if 2dsphere index is not yet built
        console.warn('Geospatial $geoNear fallback:', geoErr.message);
        listings = await FoodListing.find(filter)
          .populate('providerId', 'name email phone')
          .sort(sort || '-createdAt')
          .lean();

        const calculated = listings
          .map(l => {
            const pLat = l.pickupLat ?? l.location?.coordinates?.[1];
            const pLng = l.pickupLng ?? l.location?.coordinates?.[0];
            let dist = null;
            if (pLat !== undefined && pLng !== undefined) {
              dist = Number(calculateHaversineDistance(parsedLat, parsedLng, pLat, pLng).toFixed(1));
            }
            return { ...l, distance: dist };
          })
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

        const withinRadius = calculated.filter(l => l.distance !== null && l.distance <= radiusKm);
        listings = withinRadius.length > 0 ? withinRadius : calculated;
      }

      // Ensure pickupLat, pickupLng and GeoJSON location.coordinates are populated on every item
      listings = listings.map(l => {
        const latVal = l.pickupLat ?? l.location?.coordinates?.[1];
        const lngVal = l.pickupLng ?? l.location?.coordinates?.[0];
        return {
          ...l,
          pickupLat: latVal,
          pickupLng: lngVal,
          location: l.location || (latVal !== undefined && lngVal !== undefined ? { type: 'Point', coordinates: [lngVal, latVal] } : undefined)
        };
      });

      if (sortByDistance === 'false') {
        listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    } else {
      listings = await FoodListing.find(filter)
        .populate('providerId', 'name email phone')
        .sort(sort || '-createdAt')
        .lean();
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

    // Resolve coordinates if address changed, coordinates were passed, or listing lacks valid coords
    const addressChanged = ['pickupAddress', 'pickupCity', 'pickupState', 'pickupPincode']
      .some(f => req.body[f] !== undefined);
    const coordsProvided = ['pickupLat', 'pickupLng', 'latitude', 'longitude', 'location']
      .some(f => req.body[f] !== undefined);

    if (addressChanged || coordsProvided || !listing.pickupLat || !listing.pickupLng) {
      const resolvedCoords = await resolveListingCoordinates({
        pickupLat: req.body.pickupLat ?? (addressChanged && !coordsProvided ? undefined : listing.pickupLat),
        pickupLng: req.body.pickupLng ?? (addressChanged && !coordsProvided ? undefined : listing.pickupLng),
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        location: req.body.location,
        pickupAddress: listing.pickupAddress,
        pickupCity: listing.pickupCity,
        pickupState: listing.pickupState,
        pickupPincode: listing.pickupPincode
      });
      listing.pickupLat = resolvedCoords.pickupLat;
      listing.pickupLng = resolvedCoords.pickupLng;
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
