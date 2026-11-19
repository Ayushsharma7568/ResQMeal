import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDisplayDate } from '../../utils/dateUtils';

// Fix Leaflet default icon paths (Vite bundler issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom green marker for food listings
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom blue marker for user/seeker location
const blueIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to smoothly pan map view when center updates or fit bounds when multiple listings exist
const MapPanner = ({ center, zoom, geoListings = [], userLocation = null }) => {
  const map = useMap();
  const lastStateRef = React.useRef({ centerKey: null, boundsKey: null });

  // Invalidate Leaflet map size on mount and whenever listings change to ensure correct rendering inside tabs/containers
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [map, geoListings.length]);

  useEffect(() => {
    // 1. If user location is explicitly provided, center on user location
    if (userLocation?.lat && userLocation?.lng && !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
      const uLat = parseFloat(userLocation.lat);
      const uLng = parseFloat(userLocation.lng);
      const userKey = `user:${uLat.toFixed(4)},${uLng.toFixed(4)}`;
      if (lastStateRef.current.centerKey !== userKey) {
        lastStateRef.current.centerKey = userKey;
        map.setView([uLat, uLng], zoom || 12, { animate: true });
      }
      return;
    }

    // 2. If multiple listings exist across different areas/cities, fit bounds to display all listings
    if (geoListings.length > 1) {
      const boundsKey = geoListings.map(l => `${l._lat.toFixed(3)},${l._lng.toFixed(3)}`).sort().join(';');
      if (lastStateRef.current.boundsKey !== boundsKey) {
        lastStateRef.current.boundsKey = boundsKey;
        const bounds = L.latLngBounds(geoListings.map(l => [l._lat, l._lng]));
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13, animate: true });
      }
      return;
    }

    // 3. Single listing: focus on it
    if (geoListings.length === 1) {
      const singleKey = `single:${geoListings[0]._lat.toFixed(4)},${geoListings[0]._lng.toFixed(4)}`;
      if (lastStateRef.current.centerKey !== singleKey) {
        lastStateRef.current.centerKey = singleKey;
        map.setView([geoListings[0]._lat, geoListings[0]._lng], zoom || 13, { animate: true });
      }
      return;
    }

    // 4. Default / explicit center fallback
    if (center?.[0] && center?.[1]) {
      const centerKey = `center:${center[0].toFixed(4)},${center[1].toFixed(4)}:${zoom}`;
      if (lastStateRef.current.centerKey !== centerKey) {
        lastStateRef.current.centerKey = centerKey;
        map.setView([center[0], center[1]], zoom || map.getZoom(), { animate: true });
      }
    }
  }, [center, zoom, geoListings, userLocation, map]);

  return null;
};

// Define India geographic bounds: [[southwest_lat, southwest_lng], [northeast_lat, northeast_lng]]
const INDIA_BOUNDS = [
  [6.0, 68.0],  // Southern & Western India margin
  [37.5, 97.5]  // Northern & Eastern India margin
];
const INDIA_DEFAULT_CENTER = [22.5, 79.0];

/**
 * Defensively extract valid { lat, lng } from GeoJSON location.coordinates ([lng, lat]),
 * pickupLat/pickupLng, or latitude/longitude fields. Returns null for missing/invalid/zero coords.
 */
export const extractCoordinates = (item) => {
  if (!item || typeof item !== 'object') return null;

  const isValidPair = (lat, lng) =>
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (lat !== 0 || lng !== 0) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  // 1. GeoJSON Point format: location.coordinates = [longitude, latitude]
  if (item.location && Array.isArray(item.location.coordinates) && item.location.coordinates.length >= 2) {
    const lng = parseFloat(item.location.coordinates[0]);
    const lat = parseFloat(item.location.coordinates[1]);
    if (isValidPair(lat, lng)) return { lat, lng };
  }

  // 2. Top-level pickupLat / pickupLng
  if (item.pickupLat !== undefined && item.pickupLat !== null && item.pickupLng !== undefined && item.pickupLng !== null) {
    const lat = parseFloat(item.pickupLat);
    const lng = parseFloat(item.pickupLng);
    if (isValidPair(lat, lng)) return { lat, lng };
  }

  // 3. Top-level latitude / longitude
  if (item.latitude !== undefined && item.latitude !== null && item.longitude !== undefined && item.longitude !== null) {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);
    if (isValidPair(lat, lng)) return { lat, lng };
  }

  // 4. Top-level lat / lng aliases
  if (item.lat !== undefined && item.lat !== null && item.lng !== undefined && item.lng !== null) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lng);
    if (isValidPair(lat, lng)) return { lat, lng };
  }

  return null;
};

/**
 * Reusable India-focused Map component for MORSL.
 *
 * Props:
 *   listings       — array of FoodListing / Delivery map objects
 *   center         — [lat, lng] default map center (auto-centers on listings if omitted)
 *   zoom           — default zoom level
 *   height         — CSS height string, default '420px'
 *   userLocation   — { lat, lng, label } optional user marker
 *   onListingClick — callback(listing) when popup CTA is clicked
 */
export const MapView = ({
  listings = [],
  center = null,
  zoom = null,
  height = '420px',
  userLocation = null,
  onListingClick = null,
  onSelectListing = null,
  actionLabel = 'Claim →',
}) => {
  const handleAction = onListingClick || onSelectListing;

  const geoListings = (Array.isArray(listings) ? listings : [])
    .map((item) => {
      const coords = extractCoordinates(item);
      if (!coords) return null;
      return { ...item, _lat: coords.lat, _lng: coords.lng };
    })
    .filter(Boolean);

  const effectiveCenter = center ||
    (userLocation?.lat && userLocation?.lng ? [parseFloat(userLocation.lat), parseFloat(userLocation.lng)] : null) ||
    (geoListings.length === 1 ? [geoListings[0]._lat, geoListings[0]._lng] : INDIA_DEFAULT_CENTER);

  const effectiveZoom = zoom || (userLocation ? 12 : (geoListings.length === 1 ? 13 : 5));

  return (
    <div style={{ height, width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)' }}>
      <MapContainer
        center={effectiveCenter}
        zoom={effectiveZoom}
        minZoom={4}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={0.8}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        scrollWheelZoom={true}
      >
        <MapPanner center={effectiveCenter} zoom={effectiveZoom} geoListings={geoListings} userLocation={userLocation} />

        {/* OpenStreetMap TileLayer — No API key needed */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        {userLocation && userLocation.lat && userLocation.lng && !isNaN(userLocation.lat) && !isNaN(userLocation.lng) && (
          <Marker
            position={[parseFloat(userLocation.lat), parseFloat(userLocation.lng)]}
            icon={blueIcon}
          >
            <Popup>
              <div style={{ minWidth: '140px', fontFamily: 'inherit' }}>
                <strong style={{ color: '#0f172a' }}>📍 {userLocation.label || 'Your Location'}</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Food listing markers within India */}
        {geoListings.map((listing) => {
          const providerName = listing.providerName || listing.providerId?.name;
          const locationText =
            listing.location?.address ||
            [listing.pickupAddress, listing.pickupCity, listing.pickupState].filter(Boolean).join(', ');
          const parsedDeadline = listing.pickupDeadline ? new Date(listing.pickupDeadline) : null;
          const validDeadline = parsedDeadline && !isNaN(parsedDeadline.getTime()) ? parsedDeadline : null;

          return (
            <Marker
              key={listing._id || `${listing._lat}-${listing._lng}-${listing.title}`}
              position={[listing._lat, listing._lng]}
              icon={greenIcon}
            >
              <Popup minWidth={230}>
                <div style={{ fontFamily: 'inherit', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                    {listing.title || 'Food Surplus'}
                  </div>
                  {providerName && (
                    <div style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 700, marginBottom: '0.2rem' }}>
                      🏢 {providerName}
                    </div>
                  )}
                  {locationText && (
                    <div style={{ fontSize: '0.76rem', color: '#475569', marginBottom: '0.25rem' }}>
                      📍 {locationText}
                    </div>
                  )}
                  {listing.foodItems && listing.foodItems.length > 0 && (
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '0.2rem' }}>
                      🍽️ {listing.foodItems.slice(0, 2).map(i => i.name).join(', ')}
                      {listing.foodItems.length > 2 && ` +${listing.foodItems.length - 2} more`}
                    </div>
                  )}
                  {listing.distance !== undefined && listing.distance !== null && !isNaN(listing.distance) && (
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#7c3aed', marginBottom: '0.2rem' }}>
                      📏 {listing.distance} km away
                    </div>
                  )}
                  {validDeadline && (
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                      ⏰ Pickup by: {formatDisplayDate(listing.pickupDeadline || validDeadline)}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', gap: '0.5rem' }}>
                    {listing.priceType ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: listing.priceType === 'FREE' ? '#d1fae5' : '#fef3c7',
                        color: listing.priceType === 'FREE' ? '#065f46' : '#92400e',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        {listing.priceType === 'FREE' ? '🟢 FREE' : `₹${listing.price}`}
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: '#ccfbf1',
                        color: '#0f766e',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        📦 {listing.status || 'READY'}
                      </span>
                    )}
                    {handleAction && (
                      <button
                        onClick={() => handleAction(listing)}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          backgroundColor: '#0f766e',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          cursor: 'pointer'
                        }}
                      >
                        {actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
