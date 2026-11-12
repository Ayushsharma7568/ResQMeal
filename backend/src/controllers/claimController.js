import { validationResult } from 'express-validator';
import FoodClaim from '../models/FoodClaim.js';
import FoodListing from '../models/FoodListing.js';
import Delivery from '../models/Delivery.js';
import { sendNotification } from '../services/notificationService.js';
import { emitEvent } from '../config/socket.js';

// ─────────────────────────────────────────────
// POST /api/claims — Create a food claim (Seeker)
// ─────────────────────────────────────────────
export const createClaim = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }

    const { foodListingId, requestedPickupTime, notes } = req.body;

    // 1. Verify listing exists
    const listing = await FoodListing.findById(foodListingId);
    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Food listing not found'
      });
    }

    // 2. Check provider trying to claim own listing
    if (listing.providerId.toString() === req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Providers cannot claim their own food listing'
      });
    }

    // 3. Verify listing status is AVAILABLE
    if (listing.status !== 'AVAILABLE') {
      return res.status(400).json({
        status: 'error',
        message: `Listing cannot be claimed because it is currently '${listing.status}'`
      });
    }

    // 4. Verify listing hasn't expired
    if (new Date(listing.pickupDeadline) <= new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Listing cannot be claimed because its pickup deadline has passed'
      });
    }

    // 5. Prevent duplicate active claim (PENDING or APPROVED) by the same seeker
    const existingClaim = await FoodClaim.findOne({
      foodListingId,
      seekerId: req.user._id,
      status: { $in: ['PENDING', 'APPROVED'] }
    });

    if (existingClaim) {
      return res.status(409).json({
        status: 'error',
        message: `You already have an active claim (${existingClaim.status}) for this food listing`
      });
    }

    // 6. Create claim
    const claim = await FoodClaim.create({
      foodListingId,
      seekerId: req.user._id,
      providerId: listing.providerId,
      requestedPickupTime,
      notes
    });

    await claim.populate([
      { path: 'foodListingId' },
      { path: 'providerId', select: 'name email phone' }
    ]);

    // Send notification to food provider
    await sendNotification({
      recipientId: listing.providerId,
      type: 'CLAIM_SUBMITTED',
      title: 'New Food Claim Submitted',
      message: `${req.user.name || 'A food seeker'} requested your listing "${listing.title}".`,
      relatedEntityType: 'FoodClaim',
      relatedEntityId: claim._id
    });

    // Real-Time Socket.io event: Notify Provider immediately
    const claimData = claim.toObject ? claim.toObject() : claim;
    emitEvent('claim:created', {
      claim: claimData,
      providerId: listing.providerId.toString()
    });

    res.status(201).json({
      status: 'success',
      message: 'Food claim submitted successfully',
      data: { claim }
    });
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the food claim'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/claims/my — Get seeker's own claims
// ─────────────────────────────────────────────
export const getMyClaims = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const filter = { seekerId: req.user._id };
    if (status) {
      filter.status = status;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      FoodClaim.find(filter)
        .populate('foodListingId')
        .populate('providerId', 'name email phone')
        .sort(sort)
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
      data: { claims }
    });
  } catch (error) {
    console.error('Get my claims error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your claims'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/claims/incoming — Get provider's incoming claims
// ─────────────────────────────────────────────
export const getIncomingClaims = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const filter = { providerId: req.user._id };
    if (status) {
      filter.status = status;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      FoodClaim.find(filter)
        .populate('foodListingId')
        .populate('seekerId', 'name email phone')
        .sort(sort)
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
      data: { claims }
    });
  } catch (error) {
    console.error('Get incoming claims error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching incoming claims'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/claims/:id — Get a single claim
// ─────────────────────────────────────────────
export const getClaim = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid claim ID format'
      });
    }

    const claim = await FoodClaim.findById(req.params.id)
      .populate('foodListingId')
      .populate('seekerId', 'name email phone')
      .populate('providerId', 'name email phone');

    if (!claim) {
      return res.status(404).json({
        status: 'error',
        message: 'Food claim not found'
      });
    }

    // Only seeker, provider, or admin can view
    const isSeeker = claim.seekerId._id.toString() === req.user._id.toString();
    const isProvider = claim.providerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isSeeker && !isProvider && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view this claim'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { claim }
    });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the claim'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/claims/:id/approve — Approve a claim (Provider)
// ─────────────────────────────────────────────
export const approveClaim = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid claim ID format'
      });
    }

    const claim = await FoodClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({
        status: 'error',
        message: 'Food claim not found'
      });
    }

    // Verify user is the provider or ADMIN
    if (claim.providerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Only the listing provider can approve this claim'
      });
    }

    // Must be PENDING
    if (claim.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot approve a claim with status '${claim.status}'`
      });
    }

    // Check listing status
    const listing = await FoodListing.findById(claim.foodListingId);
    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Associated food listing not found'
      });
    }

    if (listing.status !== 'AVAILABLE') {
      return res.status(400).json({
        status: 'error',
        message: `Listing is no longer available (current status: '${listing.status}')`
      });
    }

    // Approve claim
    claim.status = 'APPROVED';
    claim.processedAt = new Date();
    await claim.save();

    // Update listing status to CLAIMED
    listing.status = 'CLAIMED';
    await listing.save();

    // Automatically create Delivery task for volunteer pickup & delivery
    const createdDelivery = await Delivery.create({
      foodClaimId: claim._id,
      foodListingId: listing._id,
      providerId: listing.providerId,
      seekerId: claim.seekerId,
      status: 'UNASSIGNED',
      pickupAddress: listing.pickupAddress
    });

    emitEvent('delivery:updated', {
      deliveryId: createdDelivery._id.toString(),
      foodClaimId: claim._id.toString(),
      status: createdDelivery.status,
      delivery: createdDelivery.toObject ? createdDelivery.toObject() : createdDelivery
    });

    // Auto-reject any other pending claims for this listing
    await FoodClaim.updateMany(
      {
        foodListingId: listing._id,
        _id: { $ne: claim._id },
        status: 'PENDING'
      },
      {
        $set: {
          status: 'REJECTED',
          rejectionReason: 'Listing was claimed by another seeker',
          processedAt: new Date()
        }
      }
    );

    await claim.populate([
      { path: 'foodListingId' },
      { path: 'seekerId', select: 'name email phone' },
      { path: 'providerId', select: 'name email phone' }
    ]);

    // Send notification to seeker
    await sendNotification({
      recipientId: claim.seekerId._id || claim.seekerId,
      type: 'CLAIM_APPROVED',
      title: 'Food Claim Approved!',
      message: `Your claim for "${listing.title}" has been approved by the provider.`,
      relatedEntityType: 'FoodClaim',
      relatedEntityId: claim._id
    });

    res.status(200).json({
      status: 'success',
      message: 'Claim approved successfully and listing updated to CLAIMED',
      data: { claim }
    });
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while approving the claim'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/claims/:id/reject — Reject a claim (Provider)
// ─────────────────────────────────────────────
export const rejectClaim = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid claim ID format'
      });
    }

    const claim = await FoodClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({
        status: 'error',
        message: 'Food claim not found'
      });
    }

    // Verify provider ownership
    if (claim.providerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Only the listing provider can reject this claim'
      });
    }

    if (claim.status !== 'PENDING') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot reject a claim with status '${claim.status}'`
      });
    }

    const { rejectionReason } = req.body;

    claim.status = 'REJECTED';
    claim.rejectionReason = rejectionReason || 'Rejected by food provider';
    claim.processedAt = new Date();
    await claim.save();

    await claim.populate([
      { path: 'foodListingId' },
      { path: 'seekerId', select: 'name email phone' }
    ]);

    // Send notification to seeker
    await sendNotification({
      recipientId: claim.seekerId._id || claim.seekerId,
      type: 'CLAIM_REJECTED',
      title: 'Claim Update',
      message: `Your claim was not approved. Reason: ${claim.rejectionReason}`,
      relatedEntityType: 'FoodClaim',
      relatedEntityId: claim._id
    });

    res.status(200).json({
      status: 'success',
      message: 'Claim rejected successfully',
      data: { claim }
    });
  } catch (error) {
    console.error('Reject claim error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while rejecting the claim'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/claims/:id/cancel — Cancel a claim (Seeker)
// ─────────────────────────────────────────────
export const cancelClaim = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid claim ID format'
      });
    }

    const claim = await FoodClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({
        status: 'error',
        message: 'Food claim not found'
      });
    }

    // Verify seeker ownership
    if (claim.seekerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'You can only cancel your own claims'
      });
    }

    if (!['PENDING', 'APPROVED'].includes(claim.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot cancel a claim with status '${claim.status}'`
      });
    }

    const wasApproved = claim.status === 'APPROVED';

    claim.status = 'CANCELLED';
    await claim.save();

    // Cascading Cancellation: locate any associated Delivery record linked via foodClaimId
    const linkedDelivery = await Delivery.findOne({ foodClaimId: claim._id });
    if (linkedDelivery) {
      const prevVolunteerId = linkedDelivery.volunteerId;
      linkedDelivery.status = 'CANCELLED';
      linkedDelivery.volunteerId = null;
      await linkedDelivery.save();

      emitEvent('delivery:updated', {
        deliveryId: linkedDelivery._id.toString(),
        foodClaimId: claim._id.toString(),
        status: 'CANCELLED',
        delivery: linkedDelivery.toObject ? linkedDelivery.toObject() : linkedDelivery
      });

      // Notify assigned volunteer if task was already claimed
      if (prevVolunteerId) {
        sendNotification({
          recipientId: prevVolunteerId,
          type: 'DELIVERY_CANCELLED',
          title: 'Delivery Task Cancelled',
          message: 'The food claim for this delivery was cancelled by the seeker.',
          relatedEntityType: 'Delivery',
          relatedEntityId: linkedDelivery._id
        }).catch(() => {});
      }
    }

    // If claim was approved, restore listing status back to AVAILABLE
    if (wasApproved) {
      const listing = await FoodListing.findById(claim.foodListingId);
      if (listing && (listing.status === 'CLAIMED' || listing.status === 'PICKUP_ASSIGNED')) {
        listing.status = 'AVAILABLE';
        await listing.save();
      }
    }

    // Real-Time Socket.io event: Notify Provider of claim cancellation
    const cancelledClaimData = claim.toObject ? claim.toObject() : claim;
    emitEvent('claim:cancelled', {
      claimId: claim._id.toString(),
      claim: cancelledClaimData,
      providerId: claim.providerId ? claim.providerId.toString() : undefined
    });

    res.status(200).json({
      status: 'success',
      message: 'Claim cancelled successfully',
      data: { claim }
    });
  } catch (error) {
    console.error('Cancel claim error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while cancelling the claim'
    });
  }
};
