/**
 * AI Natural Language Listing Parser for Don't Waste It.
 * Extracts food item names, quantities, units, pricing qualifiers,
 * and multi-word location entities (landmarks, street addresses, cities).
 */

export const KNOWN_CITIES = [
  'greater noida', 'new delhi', 'delhi', 'bangalore', 'bengaluru', 
  'mumbai', 'bombay', 'pune', 'hyderabad', 'chennai', 'madras', 
  'kolkata', 'calcutta', 'gurgaon', 'gurugram', 'noida', 'ghaziabad', 
  'faridabad', 'ahmedabad', 'jaipur', 'chandigarh', 'lucknow', 
  'kochi', 'cochin', 'indore', 'bhopal', 'surat', 'nagpur', 
  'patna', 'bhubaneswar', 'visakhapatnam', 'vizag', 'coimbatore', 
  'mysore', 'mysuru', 'vadodara', 'trivandrum', 'thiruvananthapuram', 
  'amritsar', 'varanasi', 'agra'
];

export const AREA_CITY_MAP = {
  // Delhi NCR
  'connaught place': 'Delhi',
  'cp': 'Delhi',
  'chandni chowk': 'Delhi',
  'karol bagh': 'Delhi',
  'hauz khas': 'Delhi',
  'saket': 'Delhi',
  'lajpat nagar': 'Delhi',
  'vasant kunj': 'Delhi',
  'rohini': 'Delhi',
  'dwarka': 'Delhi',
  'janakpuri': 'Delhi',
  'rajouri garden': 'Delhi',
  'mayur vihar': 'Delhi',
  'laxmi nagar': 'Delhi',
  'nehru place': 'Delhi',
  'khan market': 'Delhi',
  'greater kailash': 'Delhi',
  'gk': 'Delhi',
  'defence colony': 'Delhi',
  'south ext': 'Delhi',
  'south extension': 'Delhi',
  'green park': 'Delhi',
  'pitampura': 'Delhi',
  'malviya nagar': 'Delhi',
  'cyber hub': 'Gurgaon',
  'dlf cyber city': 'Gurgaon',
  'sector 29': 'Gurgaon',
  'golf course road': 'Gurgaon',
  'sohna road': 'Gurgaon',
  'sector 62': 'Noida',
  'sector 18': 'Noida',
  // Bangalore
  'koramangala': 'Bangalore',
  'indiranagar': 'Bangalore',
  'whitefield': 'Bangalore',
  'hsr layout': 'Bangalore',
  'hsr': 'Bangalore',
  'jayanagar': 'Bangalore',
  'electronic city': 'Bangalore',
  'ecity': 'Bangalore',
  'marathahalli': 'Bangalore',
  'bellandur': 'Bangalore',
  'jp nagar': 'Bangalore',
  'btm layout': 'Bangalore',
  'btm': 'Bangalore',
  'malleshwaram': 'Bangalore',
  'malleswaram': 'Bangalore',
  'rajajinagar': 'Bangalore',
  'hebbal': 'Bangalore',
  'mg road': 'Bangalore',
  'brigade road': 'Bangalore',
  'commercial street': 'Bangalore',
  'church street': 'Bangalore',
  'frazer town': 'Bangalore',
  'richmond town': 'Bangalore',
  'kammanahalli': 'Bangalore',
  'kalyan nagar': 'Bangalore',
  'banashankari': 'Bangalore',
  'basavanagudi': 'Bangalore',
  'yelahanka': 'Bangalore',
  'cunningham road': 'Bangalore',
  'sadashivanagar': 'Bangalore',
  'sarjapur': 'Bangalore',
  'bannerghatta': 'Bangalore',
  'domlur': 'Bangalore',
  // Mumbai
  'andheri': 'Mumbai',
  'andheri west': 'Mumbai',
  'andheri east': 'Mumbai',
  'bandra': 'Mumbai',
  'bandra west': 'Mumbai',
  'bandra east': 'Mumbai',
  'juhu': 'Mumbai',
  'colaba': 'Mumbai',
  'dadar': 'Mumbai',
  'powai': 'Mumbai',
  'worli': 'Mumbai',
  'bkc': 'Mumbai',
  'bandra kurla complex': 'Mumbai',
  'borivali': 'Mumbai',
  'malad': 'Mumbai',
  'thane': 'Mumbai',
  'navi mumbai': 'Mumbai',
  'lower parel': 'Mumbai',
  'marine lines': 'Mumbai',
  'marine drive': 'Mumbai',
  // Pune
  'kothrud': 'Pune',
  'viman nagar': 'Pune',
  'hinjewadi': 'Pune',
  'baner': 'Pune',
  'wakad': 'Pune',
  'koregaon park': 'Pune',
  'hadapsar': 'Pune',
  'aundh': 'Pune',
  'shivajinagar': 'Pune',
  // Hyderabad
  'hitec city': 'Hyderabad',
  'gachibowli': 'Hyderabad',
  'jubilee hills': 'Hyderabad',
  'banjara hills': 'Hyderabad',
  'kondapur': 'Hyderabad',
  'madhapur': 'Hyderabad',
  'secunderabad': 'Hyderabad',
  'kukatpally': 'Hyderabad',
  // Chennai
  't nagar': 'Chennai',
  'anna nagar': 'Chennai',
  'adyar': 'Chennai',
  'velachery': 'Chennai',
  'mylapore': 'Chennai',
  'omr': 'Chennai'
};

const LANDMARK_SUFFIXES = [
  'place', 'circle', 'road', 'street', 'layout', 'market', 'nagar', 'block',
  'sector', 'chowk', 'gali', 'lane', 'avenue', 'bazaar', 'colony', 'enclave',
  'extension', 'phase', 'vihar', 'marg', 'point', 'hub', 'complex', 'mall',
  'square', 'gate', 'cantt', 'cantonment', 'camp', 'cross', 'main', 'junction',
  'park', 'hills', 'valley', 'estate', 'station', 'west', 'east', 'north', 'south'
];

const CATEGORY_KEYWORDS = {
  COOKED_FOOD: [
    'dal', 'sabzi', 'rice', 'roti', 'rotis', 'biryani', 'curry', 'paneer',
    'gravy', 'meal', 'meals', 'pasta', 'soup', 'noodle', 'noodles', 'khichdi',
    'pulao', 'pizza', 'pizzas', 'burger', 'burgers', 'sandwich', 'sandwiches',
    'samosa', 'samosas', 'roll', 'rolls', 'wrap', 'wraps', 'tiffin', 'thali',
    'dosa', 'idli', 'chole', 'bhature', 'naan', 'paratha', 'parathas', 'fries'
  ],
  BAKERY: [
    'bread', 'bun', 'buns', 'cake', 'cakes', 'pastry', 'pastries',
    'muffin', 'muffins', 'cookie', 'cookies', 'croissant', 'croissants',
    'toast', 'bagel', 'donut', 'donuts', 'doughnut'
  ],
  FRUITS_VEGETABLES: [
    'apple', 'apples', 'banana', 'bananas', 'potato', 'potatoes',
    'tomato', 'tomatoes', 'fruit', 'fruits', 'vegetable', 'vegetables',
    'onion', 'onions', 'orange', 'oranges', 'mango', 'mangoes', 'salad'
  ],
  DAIRY: [
    'milk', 'curd', 'paneer', 'cheese', 'butter', 'yogurt', 'ghee'
  ],
  PACKAGED_FOOD: [
    'biscuit', 'biscuits', 'chips', 'snack', 'snacks', 'canned',
    'box', 'packet', 'juice box', 'namkeen'
  ],
  BEVERAGES: [
    'juice', 'tea', 'coffee', 'shake', 'beverage', 'water', 'drink', 'lassi'
  ]
};

const NON_VEG_KEYWORDS = [
  'chicken', 'mutton', 'fish', 'egg', 'eggs', 'meat', 'beef',
  'pork', 'prawn', 'prawns', 'bacon', 'pepperoni', 'seafood',
  'tuna', 'lamb', 'crab'
];

const VALID_UNITS = [
  'kg', 'g', 'litre', 'ml', 'pieces', 'plates', 'packets', 'boxes', 'servings'
];

/**
 * Format string as Title Case
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Extract Pricing and remove pricing clauses from working text
 */
export const extractPricing = (text) => {
  let workingText = text;
  let priceType = 'FREE';
  let price = 0;
  let isFree = true;

  // 1. Numeric price patterns (e.g. "price is 30", "for 40 rs", "rs 50", "₹100", "for rs 40 each")
  // Note: Carefully exclude time patterns like "at 6 PM"
  const numericPricePatterns = [
    /\b(?:price|cost|amount|rate)\s*(?:is|=|:)?\s*₹?\s*(\d+(?:\.\d+)?)(?!\s*(?:am|pm|hours?|hrs?|mins?|minutes?))\s*(?:rs|rupees|inr)?(?:\s+(?:each|per\s+(?:item|plate|serving|box|kg|piece)))?/i,
    /\b(?:for|at)\s*(?:rs\.?|inr|₹)\s*(\d+(?:\.\d+)?)(?:\s+(?:each|per\s+(?:item|plate|serving|box|kg|piece)))?/i,
    /\b(?:for)\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr)\b(?:\s+(?:each|per\s+(?:item|plate|serving|box|kg|piece)))?/i,
    /\b(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr)\b(?:\s+(?:each|per\s+(?:item|plate|serving|box|kg|piece)))?/i,
    /(?:rs\.?|₹)\s*(\d+(?:\.\d+)?)\b(?:\s+(?:each|per\s+(?:item|plate|serving|box|kg|piece)))?/i
  ];

  for (const pattern of numericPricePatterns) {
    const match = workingText.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val >= 0) {
        price = val;
        priceType = val === 0 ? 'FREE' : 'CUSTOM';
        isFree = val === 0;
        workingText = workingText.replace(match[0], ' ');
        break;
      }
    }
  }

  // 2. Relative or discounted pricing qualifiers
  if (/\b(?:half\s*price|half-price|50%\s*off|half\s*rate)\b/i.test(workingText)) {
    priceType = 'HALF';
    isFree = false;
    price = 0;
    workingText = workingText.replace(/\b(?:in\s+)?(?:half\s*price|half-price|50%\s*off|half\s*rate)\b/gi, ' ');
  } else if (/\b(?:one\s*third\s*price|1\/3\s*price|33%\s*off)\b/i.test(workingText)) {
    priceType = 'ONE_THIRD';
    isFree = false;
    price = 0;
    workingText = workingText.replace(/\b(?:in\s+)?(?:one\s*third\s*price|1\/3\s*price|33%\s*off)\b/gi, ' ');
  } else if (/\b(?:for\s+free|free|no\s+charge|donation|for\s+donation|0\s*rs|rs\s*0)\b/i.test(workingText)) {
    priceType = 'FREE';
    isFree = true;
    price = 0;
    workingText = workingText.replace(/\b(?:for\s+free|free|no\s+charge|for\s+donation|donation|0\s*rs|rs\s*0)\b/gi, ' ');
  }

  // Clean trailing filler words from price clauses
  workingText = workingText
    .replace(/\b(?:and\s+)?(?:price|cost|rate)\s*(?:is)?\b/gi, ' ')
    .replace(/\beach\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { workingText, priceType, price, isFree };
};

/**
 * Extract Location (Area/Street Address & City) and strip preposition clause
 */
export const extractLocation = (text) => {
  let workingText = text;
  let suggestedCity = null;
  let suggestedAddress = null;

  // Filter out time expressions before matching location
  const isTimeExpression = (str) => {
    return /\b\d+(?::\d+)?\s*(?:am|pm|hours?|hrs?|mins?|minutes?)\b/i.test(str) ||
           /\b(?:morning|afternoon|evening|night|noon|midnight|today|tomorrow)\b/i.test(str);
  };

  // Filter out pure packaging/containers
  const isPackagingOnly = (str) => {
    return /^(?:boxes|packets|plates|servings|pieces|portions|containers|bags)$/i.test(str.trim());
  };

  // Preposition matches: "in", "at", "near", "around", "from", "located at", "located in", "pickup at", "pickup in", "address:"
  const prepRegex = /\b(?:located\s+(?:at|in)|pickup\s+(?:at|in)|address:?|near|around|from|in|at)\s+([^,;\n]+(?:,\s*[^,;\n]+)?)(?=$|\s+(?:prepared|cooked|fresh|ready|available|before|by|with|for|price|cost)\b)/i;

  const match = workingText.match(prepRegex);
  if (match && match[1]) {
    const rawCandidate = match[1].trim();
    
    // Validate that candidate is not a time or food container
    if (!isTimeExpression(rawCandidate) && !isPackagingOnly(rawCandidate)) {
      let locCandidate = rawCandidate
        .replace(/^[,\s.-]+|[,\s.-]+$/g, '')
        .replace(/\s{2,}/g, ' ');

      // Check if candidate contains or ends with a known city
      let matchedCity = null;
      let matchedArea = null;

      // Handle comma-separated form first: "Connaught Place, Delhi"
      if (locCandidate.includes(',')) {
        const parts = locCandidate.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          matchedArea = parts[0];
          const cityCandidate = parts[1].toLowerCase().replace(/\s+city$/i, '');
          const found = KNOWN_CITIES.find(c => cityCandidate === c || cityCandidate.endsWith(c));
          if (found) {
            matchedCity = toTitleCase(found);
          } else {
            matchedCity = toTitleCase(parts[1]);
          }
        }
      }

      // If not comma separated, check against KNOWN_CITIES list (longest first)
      if (!matchedCity) {
        const lowerCandidate = locCandidate.toLowerCase();
        
        for (const city of KNOWN_CITIES) {
          // Check if candidate ends with city: e.g. "connaught place delhi" or "delhi"
          const cityRegex = new RegExp(`(?:^|\\s+)${city}(?:\\s+city)?$`, 'i');
          if (cityRegex.test(lowerCandidate)) {
            matchedCity = toTitleCase(city);
            // Area is whatever was before the city
            const areaPart = locCandidate.replace(new RegExp(`\\s*${city}(?:\\s+city)?$`, 'i'), '').trim();
            if (areaPart.length > 0) {
              matchedArea = areaPart;
            }
            break;
          }
        }
      }

      // Check AREA_CITY_MAP if area is recognized or if no city was found yet
      if (matchedArea) {
        const areaLower = matchedArea.toLowerCase();
        if (!matchedCity && AREA_CITY_MAP[areaLower]) {
          matchedCity = AREA_CITY_MAP[areaLower];
        }
      } else if (!matchedCity) {
        const candidateLower = locCandidate.toLowerCase();
        if (AREA_CITY_MAP[candidateLower]) {
          matchedArea = locCandidate;
          matchedCity = AREA_CITY_MAP[candidateLower];
        } else {
          // Check if it ends with landmark words (e.g. "connaught place", "hsr layout")
          const hasLandmarkSuffix = LANDMARK_SUFFIXES.some(suffix => 
            new RegExp(`\\b${suffix}$`, 'i').test(candidateLower)
          );
          if (hasLandmarkSuffix) {
            matchedArea = locCandidate;
            // Default to Bangalore if unmapped
            matchedCity = 'Bangalore';
          }
        }
      }

      // Format clean street address & city
      if (matchedArea && matchedCity) {
        // Strip duplicate city name from area if present
        const cleanArea = matchedArea
          .replace(new RegExp(`\\b${matchedCity}\\b`, 'gi'), '')
          .replace(/^[,\s.-]+|[,\s.-]+$/g, '')
          .trim();
        suggestedAddress = toTitleCase(cleanArea || matchedArea);
        suggestedCity = toTitleCase(matchedCity);
      } else if (matchedCity) {
        suggestedCity = toTitleCase(matchedCity);
        suggestedAddress = suggestedCity;
      } else if (matchedArea) {
        suggestedAddress = toTitleCase(matchedArea);
        suggestedCity = 'Bangalore'; // Safe fallback
      }

      // Remove matched location clause from working text
      if (suggestedCity || suggestedAddress) {
        workingText = workingText.replace(match[0], ' ').trim();
      }
    }
  }

  return { workingText, suggestedCity, suggestedAddress };
};

/**
 * Clean individual food item name
 */
export const cleanFoodName = (raw) => {
  if (!raw) return 'Surplus Food Item';

  let name = raw.trim();

  // 1. Strip leading quantities and units (e.g., "10", "10x", "10 portions of", "5 boxes of")
  name = name
    .replace(/^\s*\d+(?:\.\d+)?\s*(?:x\b|portions?\s+(?:of\b)?|plates?\s+(?:of\b)?|servings?\s+(?:of\b)?|boxes?\s+(?:of\b)?|packets?\s+(?:of\b)?|pieces?\s+(?:of\b)?|pcs?\s+(?:of\b)?|kg\s+(?:of\b)?|g\s+(?:of\b)?|litres?\s+(?:of\b)?|l\s+(?:of\b)?|ml\s+(?:of\b)?|of\b)?/gi, '')
    .replace(/^\s*of\s+/i, '');

  // 2. Strip trailing location phrases that begin with "in ...", "at ...", "near ...", or "from ..."
  name = name.replace(/\b(?:in|at|near|around|from|pickup\s+at|located\s+at)\s+.*$/gi, '');

  // 3. Strip pricing qualifiers (e.g., "for free", "free", "50% off", "half price", "rs 50", "each", "per plate")
  name = name.replace(/\b(?:for\s+free|free|no\s+charge|half\s*price|half-price|50%\s*off|1\/3\s*price|one\s*third\s*price|33%\s*off|donation|discount(?:ed)?|on\s+discount|\d+\s*(?:rs|rupees|inr))\b/gi, '');

  // 4. Strip noise connector, time words, and pricing units
  name = name.replace(/\b(prepared|cooked|fresh|at|pm|am|today|around|about|approx|approximately|roughly|nearly|leftover|surplus|extra|remaining|in|and|for|with|of|is|each|per)\b/gi, '');

  // 5. Strip unit words from food item name (e.g., "plates", "boxes", "packets", "servings", "portions", "pieces", "kg", "g")
  name = name.replace(/\b(?:kg|g|litres?|liters?|ml|pieces?|pcs?|plates?|boxes?|packets?|servings?|portions?|meals?|slices?)\b/gi, '');

  // 6. Strip trailing possessives and punctuation (e.g. "pizza's" -> "Pizza", "roti's" -> "Roti")
  name = name
    .replace(/['’]s\b/gi, '')
    .replace(/['’]\b/g, '')
    .replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()]+|[.,\/#!$%\^&\*;:{}=\-_`~()]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!name) return 'Surplus Food Item';

  return toTitleCase(name);
};

/**
 * Infer category from segment text
 */
export const inferCategory = (text) => {
  const lower = text.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some(w => lower.includes(w))) {
      return cat;
    }
  }
  return 'COOKED_FOOD';
};

/**
 * Infer foodType (VEG vs NON_VEG)
 */
export const inferFoodType = (text) => {
  const lower = text.toLowerCase();
  if (NON_VEG_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`, 'i').test(lower))) {
    return 'NON_VEG';
  }
  return 'VEG';
};

/**
 * Extract Unit from segment text
 */
export const extractUnit = (seg) => {
  const lower = seg.toLowerCase();
  
  if (/\b(?:kg|kilograms?|kilos?)\b/i.test(lower)) return 'kg';
  if (/\b(?:g|grams?)\b/i.test(lower)) return 'g';
  if (/\b(?:litres?|liters?|l)\b/i.test(lower)) return 'litre';
  if (/\b(?:ml|millilitres?|milliliters?)\b/i.test(lower)) return 'ml';
  if (/\b(?:pieces?|pcs?|slices?)\b/i.test(lower)) return 'pieces';
  if (/\b(?:plates?|thalis?)\b/i.test(lower)) return 'plates';
  if (/\b(?:boxes?)\b/i.test(lower)) return 'boxes';
  if (/\b(?:packets?|packs?|bags?)\b/i.test(lower)) return 'packets';
  if (/\b(?:servings?|portions?|meals?)\b/i.test(lower)) return 'servings';

  return 'servings';
};

/**
 * Parse raw natural language listing text into structured payload
 */
export const parseListingText = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Listing description text is required for AI parsing');
  }

  // Step 1: Extract Pricing
  const { workingText: textAfterPricing, priceType, price, isFree } = extractPricing(text.trim());

  // Step 2: Extract Location (Landmarks, Street Address, City)
  const { workingText: textAfterLocation, suggestedCity, suggestedAddress } = extractLocation(textAfterPricing);

  // Step 3: Clean remaining food text
  let foodText = textAfterLocation
    .replace(/^(?:\s*[,;\n]|\s*\band\b|\s*\bin\b)+/gi, '')
    .replace(/(?:\s*[,;\n]|\s*\band\b|\s*\bin\b)+$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Split into food segments by commas, semicolons, newlines, or conjunctions
  const rawSegments = foodText
    .split(/[,;\n]+|\b(?:and)\b/i)
    .map(s => s.trim())
    .filter(Boolean);

  const isNoiseSegment = (seg) => {
    const s = seg.toLowerCase().replace(/[.,!]+$/, '').trim();
    if (!s) return true;
    if (/^(free|half price|1\/3 price|discount|delivery|donation|urgent|asap|no charge|pickup|price|cost)$/i.test(s)) return true;
    if (/^\d+(?::\d+)?\s*(?:am|pm)$/i.test(s)) return true;
    return false;
  };

  const segments = rawSegments.filter(s => !isNoiseSegment(s));

  const items = [];

  for (const seg of segments) {
    // Quantity
    let quantity = 1;
    const numMatch = seg.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      quantity = parseFloat(numMatch[1]);
    }

    // Unit
    const unit = extractUnit(seg);

    // Food Name
    const name = cleanFoodName(seg);

    // Category
    const category = inferCategory(seg);

    // Food Type
    const foodType = inferFoodType(seg);

    items.push({
      name,
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
    title: suggestedTitle,
    primaryCategory,
    foodItems: items,
    suggestedPriceType: priceType,
    priceType,
    suggestedPrice: price,
    price,
    isFree,
    ...(suggestedCity && { suggestedCity, pickupCity: suggestedCity, city: suggestedCity }),
    ...(suggestedAddress && { suggestedAddress, pickupAddress: suggestedAddress, address: suggestedAddress }),
    aiConfidence: 0.94,
    parsedAt: new Date()
  };
};
