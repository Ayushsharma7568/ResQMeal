import { validationResult } from 'express-validator';
import Delivery from '../models/Delivery.js';
import FoodClaim from '../models/FoodClaim.js';
import FoodListing from '../models/FoodListing.js';
import { sendNotification } from '../services/notificationService.js';
import { calculateHaversineDistance } from '../utils/distance.js';
import { emitEvent } from '../config/socket.js';

const emitDeliveryUpdate = (delivery) => {
  if (!delivery) return;
  const rawClaimId = delivery.foodClaimId?._id || delivery.foodClaimId;
  emitEvent('delivery:updated', {
    deliveryId: delivery._id?.toString(),
    foodClaimId: rawClaimId ? rawClaimId.toString() : null,
    status: delivery.status,
    acceptedAt: delivery.acceptedAt,
    pickedUpAt: delivery.pickedUpAt,
    deliveredAt: delivery.deliveredAt,
    completedAt: delivery.completedAt,
    delivery: delivery.toObject ? delivery.toObject() : delivery
  });
};

// ─────────────────────────────────────────────
// POST /api/deliveries — Create delivery task for an APPROVED claim
// ─────────────────────────────────────────────
export const createDeliveryTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }

    const { foodClaimId, notes, deliveryAddress } = req.body;

    // 1. Verify claim exists
    const claim = await FoodClaim.findById(foodClaimId);
    if (!claim) {
      return res.status(404).json({
        status: 'error',
        message: 'Food claim not found'
      });
    }

    // 2. Validate that only APPROVED claims can enter delivery
    if (claim.status !== 'APPROVED') {
      return res.status(400).json({
        status: 'error',
        message: `Only APPROVED claims can enter the delivery workflow. Current claim status: '${claim.status}'`
      });
    }

    // 3. Prevent duplicate delivery task for same claim
    const existingDelivery = await Delivery.findOne({ foodClaimId });
    if (existingDelivery) {
      return res.status(409).json({
        status: 'error',
        message: 'A delivery task already exists for this food claim',
        data: { delivery: existingDelivery }
      });
    }

    // 4. Fetch listing for pickup address
    const listing = await FoodListing.findById(claim.foodListingId);
    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Associated food listing not found'
      });
    }

    // 5. Create Delivery task
    const delivery = await Delivery.create({
      foodClaimId: claim._id,
      foodListingId: listing._id,
      providerId: listing.providerId,
      seekerId: claim.seekerId,
      status: 'UNASSIGNED',
      pickupAddress: listing.pickupAddress,
      deliveryAddress: deliveryAddress || 'Address specified by seeker',
      escalationTier: listing.escalationTier || 1,
      isCriticalRescue: Boolean(listing.isCriticalRescue),
      currentRadiusKm: listing.currentRadiusKm || 2,
      notes
    });

    await delivery.populate([
      { path: 'foodListingId' },
      { path: 'providerId', select: 'name email phone' },
      { path: 'seekerId', select: 'name email phone' }
    ]);

    emitDeliveryUpdate(delivery);

    res.status(201).json({
      status: 'success',
      message: 'Delivery task created successfully',
      data: { delivery }
    });
  } catch (error) {
    console.error('Create delivery task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the delivery task'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/deliveries/available — Volunteers view available pickup tasks
// ─────────────────────────────────────────────
export const getAvailableTasks = async (req, res) => {
  try {
    const { city, lat, lng, maxDistance, sortByDistance, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const filter = {
      status: { $in: ['UNASSIGNED', 'PENDING', 'AWAITING_PICKUP'] },
      volunteerId: null
    };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    let deliveries = await Delivery.find(filter)
      .populate('foodClaimId')
      .populate('foodListingId')
      .populate('providerId', 'name email phone')
      .populate('seekerId', 'name email phone')
      .sort(sort)
      .lean();

    // Guardrail: Explicitly exclude deliveries where status is CANCELLED or linked foodClaimId is CANCELLED
    deliveries = deliveries.filter(d =>
      d.status !== 'CANCELLED' &&
      (!d.foodClaimId || d.foodClaimId.status !== 'CANCELLED')
    );

    // Optional city filter on populated pickup details
    if (city) {
      deliveries = deliveries.filter(d =>
        d.foodListingId?.pickupCity?.toLowerCase().includes(city.toLowerCase()) ||
        d.pickupAddress?.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Map dispatch escalation fields from delivery or linked food listing
    deliveries = deliveries.map(d => {
      const listing = d.foodListingId;
      const isCritical = Boolean(d.isCriticalRescue || listing?.isCriticalRescue);
      const tier = d.escalationTier || listing?.escalationTier || (isCritical ? 3 : 1);
      const radiusKm = d.currentRadiusKm || listing?.currentRadiusKm || (tier === 3 ? 10 : (tier === 2 ? 5 : 2));
      return {
        ...d,
        isCriticalRescue: isCritical,
        escalationTier: tier,
        currentRadiusKm: radiusKm
      };
    });

    // Calculate pickup distance if volunteer coordinates provided
    const vLat = parseFloat(lat);
    const vLng = parseFloat(lng);
    const hasCoordinates = !isNaN(vLat) && !isNaN(vLng);

    if (hasCoordinates) {
      deliveries = deliveries.map(d => {
        let pickupDist = null;
        const pLat = d.foodListingId?.pickupLat;
        const pLng = d.foodListingId?.pickupLng;
        if (pLat !== undefined && pLng !== undefined) {
          pickupDist = calculateHaversineDistance(vLat, vLng, pLat, pLng);
        }
        return { ...d, pickupDistance: pickupDist };
      });

      if (maxDistance !== undefined && !isNaN(parseFloat(maxDistance))) {
        const maxKm = parseFloat(maxDistance);
        deliveries = deliveries.filter(d => d.pickupDistance !== null && d.pickupDistance <= maxKm);
      }

      if (sortByDistance === 'true') {
        deliveries.sort((a, b) => {
          if (a.pickupDistance === null) return 1;
          if (b.pickupDistance === null) return -1;
          return a.pickupDistance - b.pickupDistance;
        });
      }
    }

    const total = deliveries.length;
    const paginatedDeliveries = deliveries.slice(skip, skip + limitNum);

    res.status(200).json({
      status: 'success',
      results: paginatedDeliveries.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total
      },
      data: { deliveries: paginatedDeliveries }
    });
  } catch (error) {
    console.error('Get available tasks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching available pickup tasks'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/deliveries/:id/accept — Volunteer accepts a task
// ─────────────────────────────────────────────
export const acceptTask = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery ID format'
      });
    }

    // 1. Verify delivery exists and check cancellation guardrail
    const existing = await Delivery.findById(req.params.id).populate('foodClaimId');
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery task not found'
      });
    }

    if (existing.status === 'CANCELLED' || existing.foodClaimId?.status === 'CANCELLED') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot accept or update a delivery for a cancelled order'
      });
    }

    // 2. Check if already assigned to another volunteer or not in ready state
    if (existing.volunteerId !== null || !['UNASSIGNED', 'PENDING', 'AWAITING_PICKUP'].includes(existing.status)) {
      return res.status(409).json({
        status: 'error',
        message: `Task cannot be accepted — current status is '${existing.status}' and may already be assigned to another volunteer`
      });
    }

    // 3. Atomic update to prevent multiple volunteers from accepting the same task
    const delivery = await Delivery.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $in: ['UNASSIGNED', 'PENDING', 'AWAITING_PICKUP'] },
        volunteerId: null
      },
      {
        $set: {
          volunteerId: req.user._id,
          status: 'ASSIGNED',
          acceptedAt: new Date()
        }
      },
      { new: true }
    );

    if (!delivery) {
      return res.status(409).json({
        status: 'error',
        message: 'Task could not be assigned (may have been claimed by another volunteer)'
      });
    }

    // Update food listing status to PICKUP_ASSIGNED
    await FoodListing.findByIdAndUpdate(delivery.foodListingId, {
      status: 'PICKUP_ASSIGNED'
    });

    await delivery.populate([
      { path: 'foodListingId' },
      { path: 'providerId', select: 'name email phone' },
      { path: 'seekerId', select: 'name email phone' },
      { path: 'volunteerId', select: 'name email phone' }
    ]);

    // Send notifications to seeker and provider
    await Promise.all([
      sendNotification({
        recipientId: delivery.seekerId._id || delivery.seekerId,
        type: 'DELIVERY_ASSIGNED',
        title: 'Volunteer Assigned',
        message: `Volunteer ${req.user.name || ''} has accepted the pickup task for your claimed food.`,
        relatedEntityType: 'Delivery',
        relatedEntityId: delivery._id
      }),
      sendNotification({
        recipientId: delivery.providerId._id || delivery.providerId,
        type: 'DELIVERY_ASSIGNED',
        title: 'Volunteer Assigned',
        message: `Volunteer ${req.user.name || ''} will pick up your food listing.`,
        relatedEntityType: 'Delivery',
        relatedEntityId: delivery._id
      })
    ]);

    emitDeliveryUpdate(delivery);

    res.status(200).json({
      status: 'success',
      message: 'Pickup task accepted successfully',
      data: { delivery }
    });
  } catch (error) {
    console.error('Accept task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while accepting the pickup task'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/deliveries/my — Volunteer views their assigned tasks
// ─────────────────────────────────────────────
export const getMyAssignedTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const filter = { volunteerId: req.user._id, status: { $ne: 'CANCELLED' } };
    if (status) {
      filter.status = status;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    let deliveries = await Delivery.find(filter)
      .populate('foodClaimId')
      .populate('foodListingId')
      .populate('providerId', 'name email phone')
      .populate('seekerId', 'name email phone')
      .sort(sort)
      .lean();

    // Guardrail: Exclude cancelled tasks or deliveries linked to cancelled claims
    deliveries = deliveries.filter(d =>
      d.status !== 'CANCELLED' &&
      (!d.foodClaimId || d.foodClaimId.status !== 'CANCELLED')
    );

    const total = deliveries.length;
    const paginatedDeliveries = deliveries.slice(skip, skip + limitNum);

    res.status(200).json({
      status: 'success',
      results: paginatedDeliveries.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total
      },
      data: { deliveries: paginatedDeliveries }
    });
  } catch (error) {
    console.error('Get my assigned tasks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your assigned tasks'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/deliveries/:id/picked-up — Volunteer marks food as picked up
// ─────────────────────────────────────────────
export const markPickedUp = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery ID format'
      });
    }

    const delivery = await Delivery.findById(req.params.id).populate('foodClaimId');
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery task not found'
      });
    }

    // Guardrail: Cannot accept or update a delivery for a cancelled order
    if (delivery.status === 'CANCELLED' || delivery.foodClaimId?.status === 'CANCELLED') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot accept or update a delivery for a cancelled order'
      });
    }

    // Verify assigned volunteer or ADMIN
    if (delivery.volunteerId?.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Only the assigned volunteer can update pickup status'
      });
    }

    // Verify current status is ASSIGNED
    if (delivery.status !== 'ASSIGNED') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot mark as picked up — task status is currently '${delivery.status}' (expected 'ASSIGNED')`
      });
    }

    delivery.status = 'PICKED_UP';
    delivery.pickedUpAt = new Date();
    await delivery.save();

    // Update listing status
    await FoodListing.findByIdAndUpdate(delivery.foodListingId, {
      status: 'PICKED_UP'
    });

    await delivery.populate([
      { path: 'foodListingId' },
      { path: 'providerId', select: 'name email phone' },
      { path: 'seekerId', select: 'name email phone' },
      { path: 'volunteerId', select: 'name email phone' }
    ]);

    // Send notification to seeker that food is picked up and en route
    sendNotification({
      recipientId: delivery.seekerId._id || delivery.seekerId,
      type: 'DELIVERY_PICKED_UP',
      title: 'Food Picked Up',
      message: 'Your food has been picked up by the volunteer and is on its way.',
      relatedEntityType: 'Delivery',
      relatedEntityId: delivery._id
    }).catch(err => console.error('Notification error on pickup:', err));

    emitDeliveryUpdate(delivery);

    res.status(200).json({
      status: 'success',
      message: 'Food marked as picked up successfully',
      data: { delivery }
    });
  } catch (error) {
    console.error('Mark picked up error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating pickup status'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/deliveries/:id/delivered — Volunteer marks food as delivered
// ─────────────────────────────────────────────
export const markDelivered = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery ID format'
      });
    }

    const delivery = await Delivery.findById(req.params.id).populate('foodClaimId');
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery task not found'
      });
    }

    // Guardrail: Cannot accept or update a delivery for a cancelled order
    if (delivery.status === 'CANCELLED' || delivery.foodClaimId?.status === 'CANCELLED') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot accept or update a delivery for a cancelled order'
      });
    }

    // Verify assigned volunteer or ADMIN
    if (delivery.volunteerId?.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Only the assigned volunteer can update delivery status'
      });
    }

    // Verify current status is PICKED_UP
    if (delivery.status !== 'PICKED_UP') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot mark as delivered — task status is currently '${delivery.status}' (expected 'PICKED_UP')`
      });
    }

    const { proofOfDelivery, notes } = req.body;

    delivery.status = 'DELIVERED';
    delivery.deliveredAt = new Date();
    if (proofOfDelivery) delivery.proofOfDelivery = proofOfDelivery;
    if (notes) delivery.notes = notes;
    await delivery.save();

    // Update listing status
    await FoodListing.findByIdAndUpdate(delivery.foodListingId, {
      status: 'DELIVERED'
    });

    await delivery.populate([
      { path: 'foodListingId' },
      { path: 'providerId', select: 'name email phone' },
      { path: 'seekerId', select: 'name email phone' },
      { path: 'volunteerId', select: 'name email phone' }
    ]);

    // Send notification to seeker that food has been delivered
    sendNotification({
      recipientId: delivery.seekerId._id || delivery.seekerId,
      type: 'DELIVERY_ARRIVED',
      title: 'Food Delivered!',
      message: 'Your food has been delivered by the volunteer. Please confirm receipt to complete the rescue.',
      relatedEntityType: 'Delivery',
      relatedEntityId: delivery._id
    }).catch(err => console.error('Notification error on delivery:', err));

    emitDeliveryUpdate(delivery);

    res.status(200).json({
      status: 'success',
      message: 'Food marked as delivered successfully',
      data: { delivery }
    });
  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating delivery status'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/deliveries/:id/confirm-receipt — Seeker confirms receipt (COMPLETED)
// ─────────────────────────────────────────────
export const confirmReceipt = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery ID format'
      });
    }

    const delivery = await Delivery.findById(req.params.id).populate('foodClaimId');
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery task not found'
      });
    }

    // Guardrail: Cannot accept or update a delivery for a cancelled order
    if (delivery.status === 'CANCELLED' || delivery.foodClaimId?.status === 'CANCELLED') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot accept or update a delivery for a cancelled order'
      });
    }

    // Verify seeker or ADMIN
    if (delivery.seekerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Only the food seeker can confirm receipt'
      });
    }

    // Status must be DELIVERED or RECEIVED
    if (!['DELIVERED', 'RECEIVED'].includes(delivery.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot confirm receipt — task status is currently '${delivery.status}' (expected 'DELIVERED')`
      });
    }

    const now = new Date();
    delivery.status = 'COMPLETED';
    delivery.receivedAt = now;
    delivery.completedAt = now;
    await delivery.save();

    // Update FoodClaim status to COMPLETED
    await FoodClaim.findByIdAndUpdate(delivery.foodClaimId, {
      status: 'COMPLETED'
    });

    // Update FoodListing status to COMPLETED
    await FoodListing.findByIdAndUpdate(delivery.foodListingId, {
      status: 'COMPLETED'
    });

    await delivery.populate([
      { path: 'foodListingId' },
      { path: 'foodClaimId' },
      { path: 'providerId', select: 'name email phone' },
      { path: 'seekerId', select: 'name email phone' },
      { path: 'volunteerId', select: 'name email phone' }
    ]);

    emitDeliveryUpdate(delivery);

    res.status(200).json({
      status: 'success',
      message: 'Receipt confirmed and delivery completed successfully',
      data: { delivery }
    });
  } catch (error) {
    console.error('Confirm receipt error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while confirming receipt'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/deliveries/:id — Get single delivery task
// ─────────────────────────────────────────────
export const getDelivery = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery ID format'
      });
    }

    const delivery = await Delivery.findById(req.params.id)
      .populate('foodListingId')
      .populate('foodClaimId')
      .populate('providerId', 'name email phone')
      .populate('seekerId', 'name email phone')
      .populate('volunteerId', 'name email phone');

    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery task not found'
      });
    }

    // Check authorization: Volunteer assigned, seeker, provider, or admin
    const isVolunteer = delivery.volunteerId?._id?.toString() === req.user._id.toString();
    const isSeeker = delivery.seekerId._id.toString() === req.user._id.toString();
    const isProvider = delivery.providerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isVolunteer && !isSeeker && !isProvider && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view this delivery task'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { delivery }
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching delivery details'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/deliveries/seeker — Seeker views their delivery tasks
// ─────────────────────────────────────────────
export const getMySeekerDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ seekerId: req.user._id })
      .populate('foodListingId')
      .populate('foodClaimId')
      .populate('providerId', 'name email phone')
      .populate('volunteerId', 'name email phone')
      .sort('-updatedAt')
      .lean();

    res.status(200).json({
      status: 'success',
      results: deliveries.length,
      data: { deliveries }
    });
  } catch (error) {
    console.error('Get seeker deliveries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching your delivery tasks'
    });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/deliveries/:id/status — Update delivery status directly (e.g. Accepted, In Transit, Delivered)
// ─────────────────────────────────────────────
export const updateDeliveryStatus = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery ID format'
      });
    }

    const { status, notes, proofOfDelivery } = req.body;
    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'Status is required'
      });
    }

    const normalized = String(status).toUpperCase().trim().replace(/[\s-]/g, '_');
    const statusMap = {
      'ACCEPTED': 'ASSIGNED',
      'ASSIGNED': 'ASSIGNED',
      'IN_TRANSIT': 'PICKED_UP',
      'INTRANSIT': 'PICKED_UP',
      'PICKED_UP': 'PICKED_UP',
      'PICKEDUP': 'PICKED_UP',
      'DELIVERED': 'DELIVERED',
      'RECEIVED': 'RECEIVED',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED',
      'CANCELED': 'CANCELLED'
    };

    const targetStatus = statusMap[normalized] || normalized;
    const validStatuses = ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status: '${status}'. Allowed values: Accepted, In Transit, Delivered, Completed, Cancelled`
      });
    }

    const delivery = await Delivery.findById(req.params.id).populate('foodClaimId');
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery task not found'
      });
    }

    // Guardrail: Cannot accept or update a delivery for a cancelled order
    if (delivery.status === 'CANCELLED' || delivery.foodClaimId?.status === 'CANCELLED') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot accept or update a delivery for a cancelled order'
      });
    }

    const isAssignedVolunteer = delivery.volunteerId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    // If accepting an unassigned task, any volunteer can claim it
    if (targetStatus === 'ASSIGNED' && (!delivery.volunteerId || delivery.status === 'UNASSIGNED')) {
      delivery.volunteerId = req.user._id;
    } else if (!isAssignedVolunteer && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the assigned volunteer or admin can update this delivery status'
      });
    }

    const now = new Date();
    delivery.status = targetStatus;
    if (notes) delivery.notes = notes;
    if (proofOfDelivery) delivery.proofOfDelivery = proofOfDelivery;

    if (targetStatus === 'ASSIGNED') {
      delivery.acceptedAt = delivery.acceptedAt || now;
      await FoodListing.findByIdAndUpdate(delivery.foodListingId, { status: 'PICKUP_ASSIGNED' });
      await sendNotification({
        recipientId: delivery.seekerId,
        type: 'DELIVERY_ASSIGNED',
        title: 'Volunteer Assigned',
        message: `Volunteer ${req.user.name || ''} has accepted the pickup task for your claimed food.`,
        relatedEntityType: 'Delivery',
        relatedEntityId: delivery._id
      }).catch(() => {});
    } else if (targetStatus === 'PICKED_UP') {
      delivery.pickedUpAt = delivery.pickedUpAt || now;
      await FoodListing.findByIdAndUpdate(delivery.foodListingId, { status: 'PICKED_UP' });
      await sendNotification({
        recipientId: delivery.seekerId,
        type: 'DELIVERY_PICKED_UP',
        title: 'Food Picked Up',
        message: 'Your food has been picked up by the volunteer and is on its way.',
        relatedEntityType: 'Delivery',
        relatedEntityId: delivery._id
      }).catch(() => {});
    } else if (targetStatus === 'DELIVERED') {
      delivery.deliveredAt = delivery.deliveredAt || now;
      await FoodListing.findByIdAndUpdate(delivery.foodListingId, { status: 'DELIVERED' });
      await sendNotification({
        recipientId: delivery.seekerId,
        type: 'DELIVERY_ARRIVED',
        title: 'Food Delivered!',
        message: 'Your food has been delivered by the volunteer. Please confirm receipt to complete the rescue.',
        relatedEntityType: 'Delivery',
        relatedEntityId: delivery._id
      }).catch(() => {});
    } else if (targetStatus === 'COMPLETED') {
      delivery.completedAt = delivery.completedAt || now;
      delivery.receivedAt = delivery.receivedAt || now;
      await FoodClaim.findByIdAndUpdate(delivery.foodClaimId, { status: 'COMPLETED' });
      await FoodListing.findByIdAndUpdate(delivery.foodListingId, { status: 'COMPLETED' });
    }

    await delivery.save();

    await delivery.populate([
      { path: 'foodListingId' },
      { path: 'foodClaimId' },
      { path: 'providerId', select: 'name email phone' },
      { path: 'seekerId', select: 'name email phone' },
      { path: 'volunteerId', select: 'name email phone' }
    ]);

    emitDeliveryUpdate(delivery);

    res.status(200).json({
      status: 'success',
      message: `Delivery status updated to ${targetStatus} successfully`,
      data: { delivery }
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating delivery status'
    });
  }
};
