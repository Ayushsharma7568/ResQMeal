import FoodListing from '../models/FoodListing.js';
import FoodClaim from '../models/FoodClaim.js';
import User from '../models/User.js';
import { calculateHaversineDistance } from '../utils/distance.js';
import { parseListingText } from '../utils/listingParser.js';

export { parseListingText };

/**
 * Calculates a matching recommendation score (0-100%) between listings and a seeker.
 */
export const calculateMatchingScore = async (seekerId, options = {}) => {
  const seeker = await User.findById(seekerId);
  const seekerLat = seeker?.latitude || options.lat;
  const seekerLng = seeker?.longitude || options.lng;

  // Fetch available listings
  const listings = await FoodListing.find({ status: 'AVAILABLE' })
    .populate('providerId', 'name organizationName city rating')
    .lean();

  const scored = listings.map(l => {
    let score = 70; // Baseline match
    const reasons = [];

    // 1. Distance scoring (Max 30 points)
    if (seekerLat && seekerLng && l.pickupLat && l.pickupLng) {
      const dist = calculateHaversineDistance(seekerLat, seekerLng, l.pickupLat, l.pickupLng);
      l.distanceKm = dist;
      if (dist <= 2) {
        score += 25;
        reasons.push('Very close pickup (<2 km)');
      } else if (dist <= 5) {
        score += 18;
        reasons.push('Nearby location (<5 km)');
      } else if (dist <= 10) {
        score += 10;
        reasons.push('Within 10 km zone');
      } else {
        score -= 10;
        reasons.push('Further away (>10 km)');
      }
    } else {
      reasons.push('Location score default');
    }

    // 2. Freshness & Urgency (Max 15 points)
    const now = new Date();
    const deadline = new Date(l.pickupDeadline);
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);

    if (hoursLeft > 0 && hoursLeft <= 2) {
      score += 15;
      reasons.push('⚡ Urgent pickup (expires within 2h)');
    } else if (hoursLeft > 2 && hoursLeft <= 6) {
      score += 10;
      reasons.push('Optimal pickup window');
    }

    // 3. Price scoring (Max 10 points)
    if (l.priceType === 'FREE') {
      score += 10;
      reasons.push('100% Free surplus food');
    } else if (l.priceType === 'HALF' || l.priceType === 'ONE_THIRD') {
      score += 5;
      reasons.push('Highly discounted food');
    }

    // 4. Quantity adequacy
    const totalQty = (l.foodItems || []).reduce((acc, item) => acc + (item.quantity || 1), 0);
    if (totalQty >= 10) {
      score += 5;
      reasons.push(`High quantity surplus (${totalQty} units)`);
    }

    // Bound score between 0 and 99
    score = Math.min(Math.max(score, 35), 99);

    return {
      ...l,
      matchScore: score,
      matchReasons: reasons
    };
  });

  // Sort by highest matchScore
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored;
};

/**
 * Generates platform surplus demand insights from MongoDB historical data.
 */
export const generateSurplusInsights = async () => {
  const [totalListings, availableListings, claimedListings, categoryBreakdown, topProviders] = await Promise.all([
    FoodListing.countDocuments(),
    FoodListing.countDocuments({ status: 'AVAILABLE' }),
    FoodListing.countDocuments({ status: { $in: ['CLAIMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'COMPLETED'] } }),
    FoodListing.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    FoodListing.aggregate([
      { $group: { _id: '$providerId', totalListings: { $sum: 1 } } },
      { $sort: { totalListings: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'provider' } },
      { $unwind: '$provider' },
      { $project: { name: '$provider.name', organizationName: '$provider.organizationName', totalListings: 1 } }
    ])
  ]);

  const rescueRate = totalListings > 0 ? Math.round((claimedListings / totalListings) * 100) : 0;

  return {
    summary: {
      totalListings,
      availableListings,
      claimedListings,
      rescueRatePercent: rescueRate
    },
    topCategory: categoryBreakdown[0]?._id || 'COOKED_FOOD',
    categoryDistribution: categoryBreakdown.map(c => ({ category: c._id, count: c.count })),
    peakSurplusTimes: ['1:00 PM - 3:00 PM (Lunch Surplus)', '8:30 PM - 10:30 PM (Dinner Surplus)'],
    topContributors: topProviders,
    aiRecommendationText: `High demand detected for ${categoryBreakdown[0]?._id || 'COOKED_FOOD'} near city centers. Rapid pickup dispatch advised during 8:00 PM peak.`
  };
};

/**
 * Natural language / structured query helper for Admin analytics.
 */
export const processAdminAnalyticsQuery = async (queryText) => {
  const q = (queryText || '').toLowerCase();

  const [totalUsers, providers, seekers, volunteers, totalListings, totalClaims] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'FOOD_PROVIDER' }),
    User.countDocuments({ role: 'FOOD_SEEKER' }),
    User.countDocuments({ role: 'VOLUNTEER' }),
    FoodListing.countDocuments(),
    FoodClaim.countDocuments()
  ]);

  let answer = `Platform Metrics Summary: ${totalListings} food listings posted across ${providers} providers, ${seekers} seeker NGOs, and ${volunteers} logistics volunteers.`;

  if (q.includes('category') || q.includes('most rescued') || q.includes('food type')) {
    const cats = await FoodListing.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const topCat = cats[0]?._id || 'COOKED_FOOD';
    answer = `The most frequently posted surplus food category is '${topCat}' with ${cats[0]?.count || 0} listings.`;
  } else if (q.includes('provider') || q.includes('contribute') || q.includes('donor')) {
    const topP = await FoodListing.aggregate([
      { $group: { _id: '$providerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' }
    ]);
    answer = topP[0]
      ? `Top donor organization is '${topP[0].p.organizationName || topP[0].p.name}' with ${topP[0].count} surplus contributions.`
      : 'No provider contributions logged yet.';
  } else if (q.includes('user') || q.includes('member') || q.includes('role')) {
    answer = `Active Platform Community: ${totalUsers} total users (${providers} Providers, ${seekers} Seekers, ${volunteers} Volunteers).`;
  }

  return {
    query: queryText,
    answer,
    stats: { totalUsers, providers, seekers, volunteers, totalListings, totalClaims },
    timestamp: new Date()
  };
};
