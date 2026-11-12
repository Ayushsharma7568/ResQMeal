import User from '../models/User.js';
import FoodListing from '../models/FoodListing.js';
import FoodClaim from '../models/FoodClaim.js';
import Delivery from '../models/Delivery.js';

/**
 * GET /api/admin/users — List all registered platform users
 */
export const getAdminUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { organizationName: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total
      },
      data: { users, count: total }
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to fetch platform users'
    });
  }
};

/**
 * PATCH /api/admin/users/:id — Toggle active status or reassign role
 */
export const updateAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (role && ['FOOD_PROVIDER', 'FOOD_SEEKER', 'VOLUNTEER', 'ADMIN'].includes(role)) {
      user.role = role;
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: user.toObject ? user.toObject() : user }
    });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to update user'
    });
  }
};

/**
 * GET /api/admin/listings — List all food listings across the entire system
 */
export const getAdminListings = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter['foodItems.category'] = category;
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { pickupAddress: { $regex: q, $options: 'i' } },
        { pickupCity: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      FoodListing.find(filter)
        .populate('providerId', 'name organizationName email phone city')
        .sort('-createdAt')
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
      data: { listings, count: total }
    });
  } catch (err) {
    console.error('Admin get listings error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to fetch listings'
    });
  }
};

/**
 * PATCH /api/admin/listings/:id — Moderate listing status
 */
export const updateAdminListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const listing = await FoodListing.findById(id);
    if (!listing) {
      return res.status(404).json({ status: 'error', message: 'Food listing not found' });
    }

    if (status && ['AVAILABLE', 'CLAIMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      listing.status = status;
      await listing.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Listing updated successfully',
      data: { listing: listing.toObject ? listing.toObject() : listing }
    });
  } catch (err) {
    console.error('Admin update listing error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to update listing'
    });
  }
};

/**
 * GET /api/admin/deliveries — List all deliveries and logistics workflows
 */
export const getAdminDeliveries = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const [deliveries, total] = await Promise.all([
      Delivery.find(filter)
        .populate('volunteerId', 'name email phone')
        .populate('providerId', 'name organizationName email phone')
        .populate('seekerId', 'name email phone')
        .populate('foodListingId', 'title category pickupAddress pickupCity')
        .populate('foodClaimId', 'status requestedPickupTime')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Delivery.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      results: deliveries.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total
      },
      data: { deliveries, count: total }
    });
  } catch (err) {
    console.error('Admin get deliveries error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to fetch deliveries'
    });
  }
};

/**
 * GET /api/admin/claims — List all claims across the platform
 */
export const getAdminClaims = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      FoodClaim.find(filter)
        .populate('foodListingId')
        .populate('seekerId', 'name email phone')
        .populate('providerId', 'name organizationName email phone')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FoodClaim.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      results: claims.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total
      },
      data: { claims, count: total }
    });
  } catch (err) {
    console.error('Admin get claims error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to fetch claims'
    });
  }
};

/**
 * GET /api/admin/analytics — System-wide analytics and performance indicators
 */
export const getAdminAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      providers,
      seekers,
      volunteers,
      totalListings,
      activeListings,
      totalClaims,
      activeClaims,
      totalDeliveries,
      completedDeliveries,
      categoryBreakdown,
      topProviders
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'FOOD_PROVIDER' }),
      User.countDocuments({ role: 'FOOD_SEEKER' }),
      User.countDocuments({ role: 'VOLUNTEER' }),
      FoodListing.countDocuments(),
      FoodListing.countDocuments({ status: 'AVAILABLE' }),
      FoodClaim.countDocuments(),
      FoodClaim.countDocuments({ status: { $in: ['PENDING', 'APPROVED'] } }),
      Delivery.countDocuments(),
      Delivery.countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED'] } }),
      FoodListing.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      FoodListing.aggregate([
        { $group: { _id: '$providerId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        { $project: { name: '$p.name', organizationName: '$p.organizationName', count: 1 } }
      ])
    ]);

    const rescuedListings = await FoodListing.find({
      status: { $in: ['COMPLETED', 'PICKED_UP', 'DELIVERED', 'CLAIMED'] }
    }).lean();

    const foodRescuedKg = rescuedListings.reduce((sum, l) => {
      const itemsWeight = (l.foodItems || []).reduce((acc, item) => acc + (parseFloat(item.quantity) || 1), 0);
      return sum + itemsWeight;
    }, 0);

    const rescueRatePercent = totalListings > 0 ? Math.round(((totalListings - activeListings) / totalListings) * 100) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        metrics: {
          totalUsers,
          providers,
          seekers,
          volunteers,
          totalListings,
          activeListings,
          totalClaims,
          activeClaims,
          totalDeliveries,
          completedDeliveries,
          foodRescuedKg: Math.round(foodRescuedKg),
          rescueRatePercent
        },
        categoryDistribution: categoryBreakdown.map(c => ({ category: c._id || 'OTHER', count: c.count })),
        topContributors: topProviders
      }
    });
  } catch (err) {
    console.error('Admin get analytics error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to generate admin analytics'
    });
  }
};

