/**
 * Calculate the great-circle distance between two points on the Earth
 * using the Haversine formula.
 *
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers rounded to 2 decimal places
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined || lon1 === undefined ||
    lat2 === undefined || lon2 === undefined ||
    lat1 === null || lon1 === null ||
    lat2 === null || lon2 === null
  ) {
    return null;
  }

  const nLat1 = parseFloat(lat1);
  const nLon1 = parseFloat(lon1);
  const nLat2 = parseFloat(lat2);
  const nLon2 = parseFloat(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
    return null;
  }

  const EARTH_RADIUS_KM = 6371;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(nLat2 - nLat1);
  const dLon = toRadians(nLon2 - nLon1);

  const radLat1 = toRadians(nLat1);
  const radLat2 = toRadians(nLat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place (e.g. 1.4 km)
};
