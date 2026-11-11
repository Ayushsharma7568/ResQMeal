import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Helper component to smoothly pan map view when center updates
const MapPanner = ({ center, zoom }) => {
  const map = useMap();
  const lat = center?.[0];
  const lng = center?.[1];
  const lastCenterRef = React.useRef({ lat: null, lng: null, zoom: null });

  useEffect(() => {
    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
      if (
        lastCenterRef.current.lat !== lat ||
        lastCenterRef.current.lng !== lng ||
        lastCenterRef.current.zoom !== zoom
      ) {
        lastCenterRef.current = { lat, lng, zoom };
        map.setView([lat, lng], zoom || map.getZoom(), { animate: true });
      }
    }
  }, [lat, lng, zoom, map]);
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

  return null;
};

/**
 * Reusable India-focused Map component for Don't Waste It.
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
    (geoListings.length > 0 ? [geoListings[0]._lat, geoListings[0]._lng] : INDIA_DEFAULT_CENTER);

  const effectiveZoom = zoom || (geoListings.length > 0 || userLocation ? 12 : 5);

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
        <MapPanner center={effectiveCenter} zoom={effectiveZoom} />

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
                      ⏰ Pickup by: {validDeadline.toLocaleDateString()}
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
