import FoodListing from '../models/FoodListing.js';
import Delivery from '../models/Delivery.js';
import { emitEvent } from '../config/socket.js';

/**
 * Autonomous Volunteer Dispatch & Expiry Matching Engine
 * Implements multi-tier cascading broadcast and time-decay lifecycle tracking.
 *
 * Tier 1 (Normal): Created within last 15 minutes -> broadcastRadius = 2 km, escalationTier = 1.
 * Tier 2 (Regional): Unassigned after 15 minutes AND shelf life remaining > 75 minutes -> broadcastRadius = 10 km, escalationTier = 2.
 * Tier 3 (Critical Rescue Mode): Shelf life remaining <= 75 minutes -> isCriticalRescue = true, escalationTier = 3, broadcastRadius = 20 km.
 */

// Engine State
let engineInterval = null;
let isRunning = false;
let lastRunAt = null;
let cycleCount = 0;
let lastStats = {
  totalProcessedListings: 0,
  totalProcessedDeliveries: 0,
  tier1Count: 0,
  tier2Count: 0,
  tier3Count: 0,
  criticalCount: 0,
  escalationsEmitted: 0
};

/**
 * Compute the escalation tier, critical flag, and broadcast radius for a listing.
 */
export const calculateListingTier = (listing, now = Date.now()) => {
  const expiresAt = listing.expiresAt || listing.pickupDeadline;
  const remainingShelfLifeMs = expiresAt
    ? (new Date(expiresAt).getTime() - now)
    : Infinity;

  const createdAt = listing.createdAt ? new Date(listing.createdAt).getTime() : now;
  const ageMs = now - createdAt;

  let tier = 1;
  let isCriticalRescue = false;
  let currentRadiusKm = 2;

  // Tier 3: Critical Rescue Mode if shelf life remaining <= 75 minutes (1 hour 15 minutes)
  if (remainingShelfLifeMs <= 75 * 60 * 1000) {
    tier = 3;
    isCriticalRescue = true;
    currentRadiusKm = 20;
  } else if (ageMs > 15 * 60 * 1000) {
    // Tier 2 (Regional): Unassigned after 15 minutes AND shelf life remaining > 75 minutes
    tier = 2;
    isCriticalRescue = false;
    currentRadiusKm = 10;
  } else {
    // Tier 1 (Normal): Created within last 15 minutes
    tier = 1;
    isCriticalRescue = false;
    currentRadiusKm = 2;
  }

  return {
    tier,
    isCriticalRescue,
    currentRadiusKm,
    remainingShelfLifeMs,
    ageMs
  };
};

/**
 * Execute a single dispatch and escalation evaluation cycle across all active listings & unassigned deliveries.
 */
export const runDispatchCycle = async () => {
  const now = Date.now();
  cycleCount++;
  lastRunAt = new Date(now).toISOString();

  let escalationsEmitted = 0;
  let tier1 = 0;
  let tier2 = 0;
  let tier3 = 0;
  let criticalCount = 0;

  try {
    // 1. Query active FoodListings that are not COMPLETED, CANCELLED, or EXPIRED
    const activeListings = await FoodListing.find({
      status: { $in: ['AVAILABLE', 'CLAIMED'] }
    });

    for (const listing of activeListings) {
      const { tier, isCriticalRescue, currentRadiusKm } = calculateListingTier(listing, now);

      if (tier === 1) tier1++;
      if (tier === 2) tier2++;
      if (tier === 3) tier3++;
      if (isCriticalRescue) criticalCount++;

      const prevTier = listing.escalationTier || 1;
      const prevCritical = Boolean(listing.isCriticalRescue);
      const prevRadius = listing.currentRadiusKm || 2;

      const hasChanged = prevTier !== tier || prevCritical !== isCriticalRescue || prevRadius !== currentRadiusKm;
      const hasEscalated = tier > prevTier || (isCriticalRescue && !prevCritical);

      if (hasChanged) {
        await FoodListing.findByIdAndUpdate(listing._id, {
          escalationTier: tier,
          isCriticalRescue,
          currentRadiusKm,
          ...(!listing.expiresAt && listing.pickupDeadline ? { expiresAt: listing.pickupDeadline } : {})
        });

        listing.escalationTier = tier;
        listing.isCriticalRescue = isCriticalRescue;
        listing.currentRadiusKm = currentRadiusKm;
      }

      // Emit real-time escalation event on transition
      if (hasEscalated) {
        escalationsEmitted++;
        emitEvent('dispatch:escalation', {
          listingId: listing._id.toString(),
          tier,
          isCriticalRescue,
          currentRadiusKm,
          message: isCriticalRescue
            ? `Emergency Rescue: ${listing.title} expires soon!`
            : `Dispatch broadcast escalated to Tier ${tier} (${currentRadiusKm} km radius) for ${listing.title}`,
          listing: {
            _id: listing._id,
            title: listing.title,
            pickupDeadline: listing.pickupDeadline,
            expiresAt: listing.expiresAt || listing.pickupDeadline,
            escalationTier: tier,
            isCriticalRescue,
            currentRadiusKm
          }
        });
      }
    }

    // 2. Query unassigned Deliveries
    const unassignedDeliveries = await Delivery.find({
      status: { $in: ['UNASSIGNED', 'PENDING', 'AWAITING_PICKUP'] },
      volunteerId: null
    }).populate('foodListingId');

    for (const delivery of unassignedDeliveries) {
      const listing = delivery.foodListingId;
      if (!listing) continue;

      const tier = listing.escalationTier || 1;
      const isCriticalRescue = Boolean(listing.isCriticalRescue);
      const currentRadiusKm = listing.currentRadiusKm || (tier === 3 ? 20 : (tier === 2 ? 10 : 2));

      const dPrevTier = delivery.escalationTier || 1;
      const dPrevCritical = Boolean(delivery.isCriticalRescue);
      const dPrevRadius = delivery.currentRadiusKm || 2;

      if (dPrevTier !== tier || dPrevCritical !== isCriticalRescue || dPrevRadius !== currentRadiusKm) {
        await Delivery.findByIdAndUpdate(delivery._id, {
          escalationTier: tier,
          isCriticalRescue,
          currentRadiusKm
        });
      }
    }

    lastStats = {
      totalProcessedListings: activeListings.length,
      totalProcessedDeliveries: unassignedDeliveries.length,
      tier1Count: tier1,
      tier2Count: tier2,
      tier3Count: tier3,
      criticalCount,
      escalationsEmitted
    };

    return {
      status: 'success',
      cycle: cycleCount,
      lastRunAt,
      stats: lastStats
    };
  } catch (error) {
    console.error('❌ Dispatch Engine Cycle Error:', error);
    return {
      status: 'error',
      message: error.message,
      cycle: cycleCount,
      lastRunAt
    };
  }
};

/**
 * Start the autonomous dispatch engine interval.
 */
export const startDispatchEngine = (intervalMs = 30000) => {
  if (isRunning) return;
  isRunning = true;
  console.log(`⏱️ Autonomous Dispatch Engine started (Interval: ${Math.round(intervalMs / 1000)}s)`);

  // Initial trigger after 2 seconds to allow DB connection to stabilize
  setTimeout(() => {
    runDispatchCycle().catch(err => console.error('Initial dispatch cycle error:', err));
  }, 2000);

  engineInterval = setInterval(() => {
    runDispatchCycle().catch(err => console.error('Recurring dispatch cycle error:', err));
  }, intervalMs);
};

/**
 * Stop the autonomous dispatch engine.
 */
export const stopDispatchEngine = () => {
  if (engineInterval) {
    clearInterval(engineInterval);
    engineInterval = null;
  }
  isRunning = false;
  console.log('🛑 Autonomous Dispatch Engine stopped.');
};

/**
 * Return current engine status and queue metrics for monitoring.
 */
export const getDispatchStatus = async () => {
  const activeListings = await FoodListing.find({
    status: { $in: ['AVAILABLE', 'CLAIMED'] }
  }).select('title status escalationTier isCriticalRescue currentRadiusKm pickupDeadline expiresAt createdAt providerId pickupCity').lean();

  const unassignedDeliveries = await Delivery.find({
    status: { $in: ['UNASSIGNED', 'PENDING', 'AWAITING_PICKUP'] },
    volunteerId: null
  }).populate('foodListingId', 'title pickupDeadline pickupCity').lean();

  const tier1 = activeListings.filter(l => (l.escalationTier || 1) === 1);
  const tier2 = activeListings.filter(l => l.escalationTier === 2);
  const tier3 = activeListings.filter(l => l.escalationTier === 3 || l.isCriticalRescue);

  return {
    engine: {
      isRunning,
      intervalSeconds: 30,
      lastRunAt,
      cycleCount
    },
    summary: {
      totalActiveListings: activeListings.length,
      totalUnassignedDeliveries: unassignedDeliveries.length,
      tier1Count: tier1.length,
      tier2Count: tier2.length,
      tier3Count: tier3.length,
      criticalRescueCount: tier3.length
    },
    queue: {
      tier1,
      tier2,
      tier3
    },
    unassignedDeliveries
  };
};

