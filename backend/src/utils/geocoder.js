/**
 * Geocoding & Coordinate Resolution Utility for Don't Waste It.
 * Resolves explicit coordinates, known Bangalore/India neighborhood lookups,
 * external OpenStreetMap Nominatim geocoding fallback, and Bangalore central defaults.
 */

const BANGALORE_CENTER = [12.9716, 77.5946];

const BANGALORE_AREAS = {
  'mahatma gandhi road': [12.9756, 77.6066],
  'mg road': [12.9756, 77.6066],
  'koramangala': [12.9352, 77.6245],
  'indiranagar': [12.9784, 77.6408],
  'whitefield': [12.9698, 77.7500],
  'hsr layout': [12.9121, 77.6446],
  'hsr': [12.9121, 77.6446],
  'jayanagar': [12.9308, 77.5838],
  'btm layout': [12.9166, 77.6101],
  'btm': [12.9166, 77.6101],
  'electronic city': [12.8399, 77.6770],
  'marathahalli': [12.9591, 77.6974],
  'yelahanka': [13.1007, 77.5963],
  'rajajinagar': [12.9982, 77.5530],
  'malleswaram': [13.0055, 77.5692],
  'malleshwaram': [13.0055, 77.5692],
  'jp nagar': [12.9063, 77.5857],
  'hebbal': [13.0354, 77.5988],
  'banashankari': [12.9255, 77.5468],
  'bellandur': [12.9259, 77.6762],
  'sarjapur': [12.9010, 77.7077],
  'basavanagudi': [12.9406, 77.5738],
  'shivajinagar': [12.9857, 77.6057],
  'sadashivanagar': [13.0068, 77.5813],
  'frazer town': [12.9983, 77.6143],
  'ulsoor': [12.9817, 77.6286],
  'halasuru': [12.9817, 77.6286],
  'bannerghatta': [12.8875, 77.5970],
  'kengeri': [12.9144, 77.4856],
  'vijayanagar': [12.9719, 77.5305],
  'yeshwanthpur': [13.0250, 77.5340],
  'domlur': [12.9609, 77.6387],
  'brookefield': [12.9655, 77.7185],
  'kr puram': [13.0012, 77.6960],
  'rt nagar': [13.0247, 77.5948],
  'cunningham road': [12.9882, 77.5941],
  'brigade road': [12.9718, 77.6074],
  'church street': [12.9751, 77.6046],
  'majestic': [12.9767, 77.5713]
};

const CITY_FALLBACKS = {
  'new delhi': [28.6139, 77.2090],
  'delhi': [28.6139, 77.2090],
  'mumbai': [19.0760, 72.8777],
  'chennai': [13.0827, 80.2707],
  'hyderabad': [17.3850, 78.4867],
  'pune': [18.5204, 73.8567],
  'kolkata': [22.5726, 88.3639],
  'bengaluru': BANGALORE_CENTER,
  'bangalore': BANGALORE_CENTER,
  'banglore': BANGALORE_CENTER
};

/**
 * Validate numeric latitude & longitude pair (rejects null, empty, NaN, out-of-range, or 0,0).
 */
export const parseValidCoordinates = (rawLat, rawLng) => {
  if (rawLat === undefined || rawLat === null || rawLat === '' ||
      rawLng === undefined || rawLng === null || rawLng === '') {
    return null;
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

/**
 * Apply small random jitter (in degrees) so fallback pins do not stack identically.
 */
const withJitter = (lat, lng, radiusDeg = 0.005) => ({
  lat: Number((lat + (Math.random() - 0.5) * 2 * radiusDeg).toFixed(6)),
  lng: Number((lng + (Math.random() - 0.5) * 2 * radiusDeg).toFixed(6))
});

/**
 * Query OpenStreetMap Nominatim as an external geocoding fallback.
 */
const fetchNominatimCoordinates = async (query) => {
  if (!query || process.env.NODE_ENV === 'test') return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DontWasteIt-FoodRescue/1.0 (https://github.com/Ayushsharma7568/ResQMeal)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) return null;
    const results = await response.json();
    if (Array.isArray(results) && results.length > 0) {
      const parsed = parseValidCoordinates(results[0].lat, results[0].lon);
      if (parsed) return parsed;
    }
  } catch {
    // Gracefully ignore network/timeout errors and use local fallbacks
  }
  return null;
};

/**
 * Resolve valid { pickupLat, pickupLng } for a listing payload.
 * Order of precedence:
 *   1. Valid explicit coordinates (pickupLat/pickupLng, latitude/longitude, or location.coordinates)
 *   2. Internal Bangalore neighborhood dictionary match
 *   3. OpenStreetMap Nominatim external lookup (with timeout)
 *   4. Recognized city fallback or default Bangalore central coordinates with slight jitter
 */
export const resolveListingCoordinates = async ({
  pickupLat,
  pickupLng,
  latitude,
  longitude,
  location,
  pickupAddress,
  pickupCity,
  pickupState,
  pickupPincode
} = {}) => {
  // 1a. Explicit pickupLat / pickupLng
  const explicit = parseValidCoordinates(pickupLat, pickupLng);
  if (explicit) {
    return { pickupLat: explicit.lat, pickupLng: explicit.lng, source: 'explicit' };
  }

  // 1b. Explicit latitude / longitude aliases
  const explicitAlias = parseValidCoordinates(latitude, longitude);
  if (explicitAlias) {
    return { pickupLat: explicitAlias.lat, pickupLng: explicitAlias.lng, source: 'explicit' };
  }

  // 1c. Explicit GeoJSON location.coordinates [lng, lat]
  if (location && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    const explicitGeo = parseValidCoordinates(location.coordinates[1], location.coordinates[0]);
    if (explicitGeo) {
      return { pickupLat: explicitGeo.lat, pickupLng: explicitGeo.lng, source: 'explicit' };
    }
  }

  const combinedText = [pickupAddress, pickupCity, pickupState, pickupPincode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // 2. Internal Bangalore neighborhood lookup (instantaneous, high precision)
  for (const [areaKey, [baseLat, baseLng]] of Object.entries(BANGALORE_AREAS)) {
    if (combinedText.includes(areaKey)) {
      const jittered = withJitter(baseLat, baseLng, 0.0015);
      return { pickupLat: jittered.lat, pickupLng: jittered.lng, source: `area:${areaKey}` };
    }
  }

  // 3. External OpenStreetMap Nominatim fallback for specific street addresses
  const queryParts = [pickupAddress, pickupCity, pickupState, pickupPincode, 'India'].filter(Boolean);
  if (queryParts.length > 1) {
    const nominatim = await fetchNominatimCoordinates(queryParts.join(', '));
    if (nominatim) {
      return { pickupLat: nominatim.lat, pickupLng: nominatim.lng, source: 'nominatim' };
    }
  }

  // 4. City-level fallback
  for (const [cityKey, [baseLat, baseLng]] of Object.entries(CITY_FALLBACKS)) {
    if (combinedText.includes(cityKey)) {
      const jittered = withJitter(baseLat, baseLng, 0.008);
      return { pickupLat: jittered.lat, pickupLng: jittered.lng, source: `city:${cityKey}` };
    }
  }

  // 5. Default Bangalore central coordinates with slight jitter so pins do not overlap
  const fallback = withJitter(BANGALORE_CENTER[0], BANGALORE_CENTER[1], 0.008);
  return { pickupLat: fallback.lat, pickupLng: fallback.lng, source: 'default:bangalore' };
};

