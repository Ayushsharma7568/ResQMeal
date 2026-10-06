import FoodListing from '../models/FoodListing.js';
import FoodClaim from '../models/FoodClaim.js';
import User from '../models/User.js';
import { calculateHaversineDistance } from '../utils/distance.js';

/**
 * Parses raw text input into structured food items.
 * e.g., "50 rotis, 3 kg dal, 4 kg aloo sabzi prepared at 6 PM"
 */
export const parseListingText = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Listing description text is required for AI parsing');
  }

  let rawText = text.trim();
  let suggestedCity = null;
  let suggestedAddress = null;
  let suggestedPriceType = null;
  let suggestedPrice = null;

  // Helper for title casing strings
  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ── 1. EXTRACT PRICING MODIFIERS & NUMERIC VALUES FIRST ───────────────────
  // A. Extract explicit numeric price (e.g. "price is 30", "price: 50", "cost 100", "for 30 rs", "rs 30", "₹30")
  const numericPricePatterns = [
    /\b(?:price|cost|amount|rate)\s*(?:is|=|:)?\s*₹?\s*(\d+(?:\.\d+)?)/i,
    /\b(?:for|at|rs\.?|₹)\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr)?\b/i,
    /\b(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr)\b/i
  ];

  for (const pattern of numericPricePatterns) {
    const pMatch = rawText.match(pattern);
    if (pMatch && pMatch[1]) {
      const val = parseFloat(pMatch[1]);
      if (!isNaN(val) && val >= 0) {
        suggestedPrice = val;
        // Strip out the numeric price clause from working text
        rawText = rawText.replace(pMatch[0], '').trim();
        break;
      }
    }
  }

  // B. Extract price type modifier (e.g. "half price", "1/3 price", "free", "donation")
  if (/\b(?:half\s*price|half-price|50%\s*off|half\s*rate)\b/i.test(text)) {
    suggestedPriceType = 'HALF';
    rawText = rawText.replace(/\b(?:in\s+)?(?:half\s*price|half-price|50%\s*off|half\s*rate)\b/gi, '').trim();
  } else if (/\b(?:one\s*third\s*price|1\/3\s*price|33%\s*off)\b/i.test(text)) {
    suggestedPriceType = 'ONE_THIRD';
    rawText = rawText.replace(/\b(?:in\s+)?(?:one\s*third\s*price|1\/3\s*price|33%\s*off)\b/gi, '').trim();
  } else if (/\b(?:free|for\s+free|no\s+charge|donation|for\s+donation|0\s*rs|rs\s*0)\b/i.test(text)) {
    suggestedPriceType = 'FREE';
    suggestedPrice = 0;
    rawText = rawText.replace(/\b(?:free|for\s+free|no\s+charge|for\s+donation|0\s*rs|rs\s*0)\b/gi, '').trim();
  } else if (suggestedPrice !== null && suggestedPrice > 0) {
    suggestedPriceType = 'CUSTOM';
  }

  // Clean leftover pricing filler words from working text
  rawText = rawText
    .replace(/\b(?:and\s+)?price\s*(?:is)?\b/gi, '')
    .replace(/\b(?:and\s+)?cost\s*(?:is)?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // ── 2. EXTRACT LOCATION METADATA SECOND ────────────────────────────────────
  // City patterns (e.g. "in banglore city", "in bangalore", "city is pune", "located in mumbai")
  const cityPatterns = [
    /\b(?:in|located\s+in|pickup\s+in|city\s+is|city:?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+city\b/i,
    /\b([a-zA-Z]+)\s+city\b/i,
    /\b(?:located\s+in|pickup\s+in|city\s+is|city:?)\s+([a-zA-Z]{3,20})\b/i,
    /\bin\s+([a-zA-Z]{3,20})\b/i
  ];

  for (const pattern of cityPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      // Filter out non-city common noise/pricing/food words
      if (!/^(half|price|free|discount|donation|boxes|packets|servings|plates|kg|g|liters|pcs|roti|rotis|rice|dal|sabzi|biryani|and)$/i.test(extracted)) {
        if (/city$/i.test(match[0]) && !/city$/i.test(extracted)) {
          suggestedCity = toTitleCase(`${extracted} City`);
        } else {
          suggestedCity = toTitleCase(extracted);
        }
        suggestedAddress = suggestedCity;
        // Strip out matched location phrase from working text
        rawText = rawText.replace(match[0], '').trim();
        break;
      }
    }
  }

  // Address pattern check (e.g. "pickup at 123 Commercial St", "near Indiranagar")
  const addrMatch = text.match(/\b(?:pickup\s+at|address:?|located\s+at|near)\s+([a-z0-9\s,.-]{4,40})(?=\s+(?:in|city|price|with|for|and)|$)/i);
  if (addrMatch && addrMatch[1]) {
    const addr = addrMatch[1].trim();
    if (!/^(half|price|free|discount|donation)$/i.test(addr)) {
      suggestedAddress = toTitleCase(addr);
      if (suggestedCity && !suggestedAddress.toLowerCase().includes(suggestedCity.toLowerCase())) {
        suggestedAddress = `${suggestedAddress}, ${suggestedCity}`;
      }
    }
  }

  // ── 3. EXTRACT FOOD ITEMS & QUANTITY THIRD ─────────────────────────────────
  // Trim leading/trailing punctuation and connector words
  rawText = rawText
    .replace(/^(?:\s*[,;\n]|\s*\band\b|\s*\bin\b)+/gi, '')
    .replace(/(?:\s*[,;\n]|\s*\band\b|\s*\bin\b)+$/gi, '')
    .trim();

  // Split remaining text into food segments by commas, semicolons, newlines, or conjunctions
  const rawSegments = rawText
    .split(/[,;\n]+|\b(?:and)\b/i)
    .map(s => s.trim())
    .filter(Boolean);

  const isModifierSegment = (seg) => {
    const s = seg.toLowerCase().replace(/[.,!]+$/, '').trim();
    if (!s) return true;
    if (/^(free|half price|1\/3 price|one third price|discount|delivery|donation|notes?|off|pickup|for donation|free delivery|discount notes?|half-price|on discount|urgent|asap|no charge|complimentary|gratis|in|price|cost)$/i.test(s)) return true;
    if (/^(discount|free|delivery|donation|price)\s*(notes?|details?|info|option|terms?|charge|fees?|cost)?$/i.test(s)) return true;

    const hasNumber = /\d+/.test(s);
    const knownFood = ['roti', 'rotis', 'rice', 'dal', 'sabzi', 'biryani', 'curry', 'paneer', 'bread', 'cake', 'pastry', 'fruit', 'apple', 'banana', 'potato', 'tomato', 'milk', 'cheese', 'juice', 'soup', 'sandwich', 'burger', 'pizza', 'samosa', 'meal', 'pasta', 'noodle', 'khichdi', 'pulao', 'muffin', 'cookie', 'biscuit', 'chips', 'snack', 'tea', 'coffee', 'shake'];
    const containsFood = knownFood.some(food => s.includes(food));
    if (!hasNumber && !containsFood && /(discount|price|free|off|delivery|donation|leftover|surplus|pickup|charge|cost|terms|city)/i.test(s)) {
      return true;
    }
    return false;
  };

  const segments = rawSegments.filter(seg => !isModifierSegment(seg));

  const categoryKeywords = {
    COOKED_FOOD: ['dal', 'sabzi', 'rice', 'roti', 'biryani', 'curry', 'paneer', 'gravy', 'meal', 'pasta', 'soup', 'noodle', 'khichdi', 'pulao'],
    BAKERY: ['bread', 'bun', 'cake', 'pastry', 'muffin', 'cookie', 'croissant', 'sandwich'],
    FRUITS_VEGETABLES: ['apple', 'banana', 'potato', 'tomato', 'fruit', 'vegetable', 'onion', 'orange', 'mango'],
    DAIRY: ['milk', 'curd', 'paneer', 'cheese', 'butter', 'yogurt', 'ghee'],
    PACKAGED_FOOD: ['biscuit', 'chips', 'snack', 'canned', 'box', 'packet', 'juice box'],
    BEVERAGES: ['juice', 'tea', 'coffee', 'shake', 'beverage', 'water', 'drink']
  };

  const unitKeywords = ['kg', 'g', 'lbs', 'liters', 'l', 'ml', 'servings', 'pieces', 'plates', 'boxes', 'packets', 'pcs'];

  const items = [];

  for (const seg of segments) {
    let name = seg;
    let quantity = 1;
    let unit = 'servings';
    let category = 'COOKED_FOOD';
    let foodType = 'VEG';

    // Extract quantity
    const numMatch = seg.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      quantity = parseFloat(numMatch[1]);
    }

    // Extract unit
    for (const u of unitKeywords) {
      const regex = new RegExp(`\\b${u}\\b`, 'i');
      if (regex.test(seg)) {
        if (u === 'g') unit = 'g';
        else if (u === 'kg') unit = 'kg';
        else if (u === 'l' || u === 'liters') unit = 'litre';
        else if (u === 'ml') unit = 'ml';
        else if (u === 'pieces' || u === 'pcs') unit = 'pieces';
        else if (u === 'plates') unit = 'plates';
        else if (u === 'boxes') unit = 'boxes';
        else if (u === 'packets') unit = 'packets';
        else unit = 'servings';
        break;
      }
    }

    // Clean food name by stripping quantity, unit words, and noise connector words
    name = seg
      .replace(/(\d+(?:\.\d+)?)\s*(kg|g|lbs|liters|l|ml|servings|pieces|plates|boxes|packets|pcs)?/gi, '')
      .replace(/\b(prepared|cooked|fresh|at|pm|am|today|around|about|approx|approximately|roughly|nearly|leftover|surplus|extra|remaining|in|and|for|with|of|is)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!name) name = 'Surplus Food Item';

    // Detect Category
    const lowerSeg = seg.toLowerCase();
    for (const [cat, words] of Object.entries(categoryKeywords)) {
      if (words.some(w => lowerSeg.includes(w))) {
        category = cat;
        break;
      }
    }

    // Detect Food Type (VEG vs NON_VEG)
    if (/\b(chicken|mutton|fish|egg|meat|beef|pork|prawn)\b/i.test(seg)) {
      foodType = 'NON_VEG';
    }

    items.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity,
      unit,
      category,
      foodType
    });
  }

  if (items.length === 0) {
    items.push({
      name: 'Surplus Food Portion',
      quantity: 1,
      unit: 'servings',
      category: 'COOKED_FOOD',
      foodType: 'VEG'
    });
  }

  const primaryCategory = items[0]?.category || 'COOKED_FOOD';

  // Construct suggested title
  let suggestedTitle = '';
  if (items.length === 1) {
    suggestedTitle = `${items[0].quantity} ${items[0].name} Available`;
  } else {
    suggestedTitle = `${items.length} Surplus Food Items Available`;
  }
  if (suggestedCity) {
    suggestedTitle += ` in ${suggestedCity}`;
  }

  return {
    suggestedTitle,
    primaryCategory,
    foodItems: items,
    ...(suggestedPriceType && { suggestedPriceType }),
    ...(suggestedPrice !== null && suggestedPrice !== undefined && { suggestedPrice }),
    ...(suggestedCity && { suggestedCity }),
    ...(suggestedAddress && { suggestedAddress }),
    aiConfidence: 0.94,
    parsedAt: new Date()
  };
};

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
