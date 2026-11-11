import FoodClaim from '../models/FoodClaim.js';
import FoodListing from '../models/FoodListing.js';

/**
 * GET /api/analytics/impact
 * Role-based impact & sustainability aggregation (ADMIN: system-wide, FOOD_PROVIDER: own listings).
 */
export const getImpactAnalytics = async (req, res) => {
  try {
    const isProvider = req.user.role === 'FOOD_PROVIDER';
    const baseClaimMatch = isProvider ? { providerId: req.user._id } : {};
    const listingScopeMatch = isProvider ? { providerId: req.user._id } : {};

    const pipeline = [
      { $match: baseClaimMatch },
      {
        $lookup: {
          from: 'deliveries',
          localField: '_id',
          foreignField: 'foodClaimId',
          as: 'delivery'
        }
      },
      {
        $unwind: {
          path: '$delivery',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          $or: [
            { status: 'COMPLETED' },
            { 'delivery.status': { $in: ['DELIVERED', 'RECEIVED', 'COMPLETED'] } }
          ]
        }
      },
      {
        $lookup: {
          from: 'foodlistings',
          localField: 'foodListingId',
          foreignField: '_id',
          as: 'listing'
        }
      },
      {
        $unwind: {
          path: '$listing',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          claimKg: {
            $reduce: {
              input: { $ifNull: ['$listing.foodItems', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }] }
            }
          },
          rescueDate: {
            $ifNull: [
              '$delivery.deliveredAt',
              { $ifNull: ['$delivery.completedAt', '$updatedAt'] }
            ]
          }
        }
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalKgRescued: { $sum: '$claimKg' },
                completedClaimsCount: { $sum: 1 }
              }
            }
          ],
          trends: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$rescueDate' }
                },
                kgRescued: { $sum: '$claimKg' },
                rescuesCount: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } },
            { $limit: 12 }
          ]
        }
      }
    ];

    const [aggResults, activeListingsCount, totalListingsCount] = await Promise.all([
      FoodClaim.aggregate(pipeline),
      FoodListing.countDocuments({ ...listingScopeMatch, status: 'AVAILABLE' }),
      FoodListing.countDocuments(listingScopeMatch)
    ]);

    const agg = aggResults?.[0] || {};
    const rawTotalKg = agg.totals?.[0]?.totalKgRescued || 0;
    const totalKgRescued = Number(rawTotalKg.toFixed(1));
    const totalMealsProvided = Math.round(totalKgRescued * 2.5);
    const co2OffsetKg = Number((totalKgRescued * 2.5).toFixed(1));
    const completedClaimsCount = agg.totals?.[0]?.completedClaimsCount || 0;

    const trends = (agg.trends || []).map((t) => {
      const kg = Number((t.kgRescued || 0).toFixed(1));
      return {
        period: t._id,
        kgRescued: kg,
        mealsProvided: Math.round(kg * 2.5),
        co2OffsetKg: Number((kg * 2.5).toFixed(1)),
        rescuesCount: t.rescuesCount
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        scope: isProvider ? 'PROVIDER' : 'SYSTEM',
        totalKgRescued,
        totalMealsProvided,
        co2OffsetKg,
        completedClaimsCount,
        activeListingsCount,
        totalListingsCount,
        trends
      }
    });
  } catch (error) {
    console.error('Impact analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while computing impact analytics'
    });
  }
};

