import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout, getFoodImage } from '../../components/layout/DashboardLayout';
import { MapView } from '../../components/common/MapView';
import { listingApi } from '../../api/listingApi';
import { claimApi } from '../../api/claimApi';
import { deliveryApi } from '../../api/deliveryApi';
import { aiApi } from '../../api/aiApi';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Toast } from '../../components/common/Toast';
import { Skeleton } from '../../components/common/Skeleton';
import { StatusTimeline } from '../../components/common/StatusTimeline';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { motion } from 'framer-motion';
import {
  Search, Filter, MapPin, Clock, Utensils, Heart, CheckCircle2,
  AlertCircle, Truck, Package, Tag, ArrowRight, Check, Radar, Navigation, Sparkles
} from 'lucide-react';

export const SeekerDashboard = () => {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'radar' | 'claims' | 'history'
  const [listings, setListings] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [deliveriesMap, setDeliveriesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Location state
  const [userLat, setUserLat] = useState('');
  const [userLng, setUserLng] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    foodType: '',
    priceType: '',
    city: '',
    maxDistance: '',
    sortByDistance: false
  });

  // Claim Modal state
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [claimNotes, setClaimNotes] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const fetchBrowseData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.foodType) params.foodType = filters.foodType;
      if (filters.priceType) params.priceType = filters.priceType;
      if (filters.city) params.city = filters.city;

      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        params.lat = lat;
        params.lng = lng;
        if (filters.maxDistance) params.maxDistance = filters.maxDistance;
        if (filters.sortByDistance) params.sortByDistance = 'true';
      }

      const [res, aiRes] = await Promise.all([
        listingApi.getListings(params),
        aiApi.getRecommendations({ lat: userLat, lng: userLng }).catch(() => null)
      ]);
      let list = res.data?.listings || [];
      const aiRecs = aiRes?.data?.data?.recommendations || [];
      const recMap = new Map(aiRecs.map(r => [r._id, r]));

      list = list.map(item => {
        const rec = recMap.get(item._id);
        return rec ? { ...item, matchScore: rec.matchScore, matchReasons: rec.matchReasons } : item;
      });

      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(l =>
          l.title.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          (l.pickupAddress && l.pickupAddress.toLowerCase().includes(q))
        );
      }

      setListings(list);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load available food listings', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, userLat, userLng]);

  const fetchMyClaims = useCallback(async () => {
    try {
      const [claimsRes, deliveriesRes] = await Promise.all([
        claimApi.getMyClaims(),
        deliveryApi.getSeekerDeliveries().catch(() => ({ data: { deliveries: [] } }))
      ]);
      const claims = claimsRes.data?.claims || [];
      setMyClaims(claims);

      const deliveries = deliveriesRes.data?.deliveries || [];
      const delMap = {};
      for (const del of deliveries) {
        if (del.foodClaimId) {
          const claimId = typeof del.foodClaimId === 'object' ? del.foodClaimId._id : del.foodClaimId;
          if (claimId) delMap[claimId] = del;
        }
      }
      setDeliveriesMap(delMap);
    } catch (err) {
      console.error('Fetch claims error:', err);
    }
  }, []);

  useEffect(() => {
    fetchBrowseData();
  }, [filters.category, filters.foodType, filters.priceType, filters.city, fetchBrowseData]);

  // Initial fetch for claims
  useEffect(() => {
    fetchMyClaims();
  }, [fetchMyClaims]);

  // Refetch whenever switching to claims or history tabs
  useEffect(() => {
    if (activeTab === 'claims' || activeTab === 'history') {
      fetchMyClaims();
    }
  }, [activeTab, fetchMyClaims]);

  // Real-time polling (every 5s) while an active claim/delivery is in flight
  // Automatically stops polling when all claims are DELIVERED, COMPLETED, or CANCELLED
  useEffect(() => {
    const hasActiveInFlightClaims = myClaims.some(claim => {
      if (claim.status === 'PENDING') return true;
      if (claim.status === 'APPROVED') {
        const del = deliveriesMap[claim._id];
        // If delivery record is pending load or active en route
        if (!del) return true;
        return ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP'].includes(del.status);
      }
      return false;
    });

    let intervalId = null;
    if (hasActiveInFlightClaims) {
      intervalId = setInterval(() => {
        fetchMyClaims();
      }, 5000);
    }

    const handleFocus = () => {
      fetchMyClaims();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [myClaims, deliveriesMap, fetchMyClaims]);

  // Listen for sidebar tab-change events
  useEffect(() => {
    const handleTabChange = (e) => {
      const tab = e.detail?.tab;
      if (tab === 'overview' || tab === 'default' || !tab) {
        setActiveTab('browse');
      } else if (tab && ['browse', 'radar', 'claims', 'history'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('dashboard-tab-change', handleTabChange);
    return () => window.removeEventListener('dashboard-tab-change', handleTabChange);
  }, []);

  useEffect(() => {
    if (userLat && userLng) {
      fetchBrowseData();
    }
  }, [userLat, userLng, filters.maxDistance, filters.sortByDistance]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBrowseData();
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setToast({ message: 'Geolocation is not supported by your browser', type: 'error' });
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude.toFixed(6));
        setUserLng(pos.coords.longitude.toFixed(6));
        setLocationLoading(false);
        setToast({ message: 'Location detected! Listings now show distance.', type: 'success' });
      },
      () => {
        setLocationLoading(false);
        setToast({ message: 'Could not detect location. Enter manually or try again.', type: 'error' });
      }
    );
  };

  const openClaimModal = (listing) => {
    setSelectedListing(listing);
    setClaimNotes('');
    setClaimModalOpen(true);
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;
    setClaimSubmitting(true);
    try {
      await claimApi.createClaim({
        foodListingId: selectedListing._id,
        notes: claimNotes
      });
      setToast({ message: 'Claim request submitted successfully!', type: 'success' });
      setClaimModalOpen(false);
      setSelectedListing(null);
      fetchMyClaims();
      fetchBrowseData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to submit claim request', type: 'error' });
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleConfirmReceipt = async (deliveryId) => {
    try {
      await deliveryApi.confirmReceipt(deliveryId);
      setToast({ message: 'Receipt confirmed! Transfer marked as COMPLETED.', type: 'success' });
      fetchMyClaims();
    } catch (err) {
      setToast({ message: err.message || 'Failed to confirm receipt', type: 'error' });
    }
  };

  const handleCancelClaim = async (claimId) => {
    if (!window.confirm('Are you sure you want to cancel this claim?')) return;
    try {
      await claimApi.cancelClaim(claimId);
      setToast({ message: 'Claim cancelled', type: 'success' });
      fetchMyClaims();
      fetchBrowseData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to cancel claim', type: 'error' });
    }
  };

  const mapCenter = (() => {
    if (userLat && userLng) return [parseFloat(userLat), parseFloat(userLng)];
    const first = listings.find(l => l.pickupLat && l.pickupLng);
    if (first) return [first.pickupLat, first.pickupLng];
    return [22.5, 79.0];
  })();

  const geoListings = listings.filter(l => l.pickupLat && l.pickupLng);

  // Active Claims: Count all non-completed and non-cancelled claims
  // (including statuses: PENDING, ACCEPTED, APPROVED, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED)
  const isClaimActive = (claim) => {
    if (!claim) return false;
    const claimStatus = String(claim.status || '').toUpperCase();
    if (['COMPLETED', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(claimStatus)) {
      return false;
    }
    const del = deliveriesMap[claim._id];
    if (del) {
      const delStatus = String(del.status || '').toUpperCase();
      if (['COMPLETED', 'CANCELLED', 'CANCELED'].includes(delStatus)) {
        return false;
      }
    }
    return true;
  };

  const activeClaims = myClaims.filter(isClaimActive);

  // Completed Claims
  const completedClaims = myClaims.filter(claim => {
    const claimStatus = String(claim.status || '').toUpperCase();
    if (claimStatus === 'COMPLETED') return true;
    const del = deliveriesMap[claim._id];
    return del && String(del.status || '').toUpperCase() === 'COMPLETED';
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <DashboardLayout
      title="Food Seeker & NGO Hub"
      subtitle="Discover wholesome surplus food available for your organization and community"
    >
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── KPI ROW ─────────────────────────────────────────────────── */}
      <motion.div
        className="dash-kpi-grid--3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[
          {
            label: 'Available Food',
            value: listings.length,
            sub: 'Ready to claim',
            icon: <Package size={22} color="#0f766e" />,
            variant: 'teal',
            iconBg: 'rgba(204, 251, 241, 0.8)'
          },
          {
            label: 'Active Claims',
            value: activeClaims.length,
            sub: 'Non-completed & in-progress',
            icon: <Heart size={22} color="#d97706" />,
            variant: 'amber',
            iconBg: 'rgba(254, 243, 199, 0.8)'
          },
          {
            label: 'Rescues Completed',
            value: completedClaims.length,
            sub: 'Verified & served',
            icon: <CheckCircle2 size={22} color="#059669" />,
            variant: 'green',
            iconBg: 'rgba(209, 250, 229, 0.8)'
          }
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={itemVariants}
            className={`dash-kpi-card dash-kpi-card--${kpi.variant}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {kpi.label}
              </div>
              <div className="dash-kpi-icon" style={{ background: kpi.iconBg }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: '0.4rem', letterSpacing: '-0.03em' }}>
              {loading ? <Skeleton height="40px" width="60px" /> : <AnimatedCounter value={kpi.value} />}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8' }}>{kpi.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── UPGRADED TABS ───────────────────────────────────────────── */}
      <div className="dash-tabs-bar">
        {[
          { id: 'browse', label: 'Browse Food', icon: <Search size={15} />, count: listings.length },
          { id: 'radar', label: 'Rescue Radar', icon: <Radar size={15} />, count: geoListings.length, color: '#7c3aed' },
          { id: 'claims', label: 'My Claims', icon: <Heart size={15} />, count: activeClaims.length },
          { id: 'history', label: 'Rescue History', icon: <CheckCircle2 size={15} />, count: completedClaims.length }
        ].map(tab => (
          <button
            key={tab.id}
            className={`dash-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id && tab.color ? { color: tab.color } : {}}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && <span className="dash-tab-btn-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB: Listings LEFT + Map RIGHT ─────────────────────────── */}
      {activeTab === 'browse' && (
        <div>
          {/* Filters Bar */}
          <div className="dash-section-card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Search</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" className="form-input" style={{ paddingLeft: '2rem', fontSize: '0.85rem' }}
                      placeholder="Title, address..." value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Category</label>
                  <select className="form-select" style={{ fontSize: '0.85rem' }} value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                    <option value="">All Categories</option>
                    <option value="COOKED_FOOD">Cooked Food</option>
                    <option value="BAKERY">Bakery</option>
                    <option value="PACKAGED_FOOD">Packaged Food</option>
                    <option value="FRUITS_VEGETABLES">Fruits & Veg</option>
                    <option value="DAIRY">Dairy</option>
                    <option value="BEVERAGES">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Food Type</label>
                  <select className="form-select" style={{ fontSize: '0.85rem' }} value={filters.foodType}
                    onChange={(e) => setFilters({ ...filters, foodType: e.target.value })}>
                    <option value="">All Types</option>
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-Veg</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Pricing</label>
                  <select className="form-select" style={{ fontSize: '0.85rem' }} value={filters.priceType}
                    onChange={(e) => setFilters({ ...filters, priceType: e.target.value })}>
                    <option value="">All Prices</option>
                    <option value="FREE">FREE</option>
                    <option value="ONE_THIRD">ONE_THIRD</option>
                    <option value="HALF">HALF</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>City</label>
                  <input type="text" className="form-input" style={{ fontSize: '0.85rem' }}
                    placeholder="Bangalore..." value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="button" onClick={handleGetLocation} disabled={locationLoading}
                    className="hover-pop"
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#ede9fe', color: '#7c3aed',
                      fontWeight: 700, fontSize: '0.78rem', border: '1px solid #c4b5fd', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Navigation size={13} />
                    {locationLoading ? 'Detecting...' : userLat ? '📍 Location Active' : 'Auto-Detect'}
                  </button>
                  <button type="submit" className="btn btn-primary hover-pop" style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}>
                    <Search size={14} /> Apply
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Two-column: Listings LEFT + Map RIGHT */}
          <div className="dash-split-60-40">
            {/* LEFT: Listing Cards */}
            <div>
              <div className="dash-section-header">
                <span className="dash-section-title">Available Food Listings</span>
                <span className="dash-section-count">{listings.length} found</span>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height="200px" />)}
                </div>
              ) : listings.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
                >
                  {listings.map((l, idx) => (
                    <motion.div key={l._id} variants={itemVariants} className="dash-food-card">
                      {/* Image */}
                      <div className="dash-food-card-img-wrap">
                        <img
                          src={getFoodImage(idx, l.photoUrl)}
                          alt={l.title}
                          loading="lazy"
                          onError={e => { e.target.src = getFoodImage(idx + 1); }}
                        />
                        <div className="dash-food-card-img-overlay" />
                        <div className="dash-food-card-img-badge">
                          <Badge status={l.status} />
                        </div>
                        <div
                          className="dash-food-card-img-price"
                          style={{
                            background: l.priceType === 'FREE' ? 'rgba(5, 150, 105, 0.85)' : 'rgba(180, 83, 9, 0.85)',
                            color: '#ffffff'
                          }}
                        >
                          {l.priceType === 'FREE' ? '🟢 FREE' : `₹${l.price}`}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="dash-food-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <h3 style={{ fontSize: '0.97rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, flex: 1, marginRight: '0.5rem' }}>
                            {l.title}
                          </h3>
                          {l.distance !== undefined && l.distance !== null && !isNaN(l.distance) && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '0.15rem 0.5rem', borderRadius: '9999px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              📍 {l.distance} km
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 700, marginBottom: '0.4rem' }}>
                          {l.providerId?.name || 'Food Provider'}
                        </div>

                        {l.matchScore && (
                          <div className="ai-match-pill" style={{ marginBottom: '0.6rem', display: 'inline-flex' }}>
                            <Sparkles size={11} /> AI Match {l.matchScore}%
                            {l.matchReasons?.[0] ? ` · ${l.matchReasons[0]}` : ''}
                          </div>
                        )}

                        {/* Food items preview */}
                        {l.foodItems?.length > 0 && (
                          <div style={{ fontSize: '0.76rem', color: '#475569', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '8px', marginBottom: '0.6rem' }}>
                            {l.foodItems.slice(0, 2).map((item, i) => (
                              <span key={i} style={{ marginRight: '0.5rem' }}>
                                • {item.name} {item.quantity}{item.unit}
                              </span>
                            ))}
                            {l.foodItems.length > 2 && <span style={{ color: '#94a3b8' }}>+{l.foodItems.length - 2} more</span>}
                          </div>
                        )}

                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={12} color="#0f766e" />
                            {l.pickupCity || l.pickupAddress}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} color="#d97706" />
                            {new Date(l.pickupDeadline).toLocaleString()}
                          </span>
                        </div>

                        <button
                          className="btn btn-primary btn-sm hover-pop btn-shimmer"
                          style={{ width: '100%' }}
                          onClick={() => openClaimModal(l)}
                        >
                          <Heart size={15} /> Request / Claim Food
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="dash-empty-state">
                  <div className="dash-empty-state-icon">
                    <Package size={28} color="#0f766e" />
                  </div>
                  <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No listings found</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Try adjusting your filters or check back soon.</p>
                </div>
              )}
            </div>

            {/* RIGHT: Rescue Radar Map — sticky */}
            <div className="dash-map-sticky-panel">
              <div className="dash-section-card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
                <div className="dash-section-header">
                  <span className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Radar size={18} color="#7c3aed" /> Rescue Radar
                  </span>
                  <span className="dash-section-count">{geoListings.length} on map</span>
                </div>

                {!userLat && (
                  <div style={{ background: 'linear-gradient(135deg, #fdf4ff, #ede9fe)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Navigation size={14} />
                    Enable location to see distances
                    <button onClick={handleGetLocation} disabled={locationLoading} style={{ marginLeft: 'auto', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>
                      {locationLoading ? '...' : 'Enable'}
                    </button>
                  </div>
                )}

                <div className="dash-map-wide" style={{ height: '440px' }}>
                  {loading ? (
                    <Skeleton height="440px" />
                  ) : (
                    <MapView
                      listings={listings}
                      center={mapCenter}
                      zoom={userLat && userLng ? 12 : 5}
                      height="440px"
                      userLocation={userLat && userLng ? { lat: parseFloat(userLat), lng: parseFloat(userLng), label: 'Your Location' } : null}
                      onListingClick={openClaimModal}
                    />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '1rem' }}>
                  {[
                    { label: 'Free Food', value: listings.filter(l => l.priceType === 'FREE').length, color: '#059669', bg: '#f0fdf4' },
                    { label: 'Expiring Soon', value: listings.filter(l => new Date(l.pickupDeadline) < new Date(Date.now() + 6 * 3600 * 1000)).length, color: '#d97706', bg: '#fffbeb' }
                  ].map(stat => (
                    <div key={stat.label} style={{ background: stat.bg, borderRadius: '10px', padding: '0.65rem 0.85rem', textAlign: 'center', border: `1px solid ${stat.color}20` }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: stat.color }}>
                        <AnimatedCounter value={stat.value} />
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESCUE RADAR TAB ─────────────────────────────────────────── */}
      {activeTab === 'radar' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #c4b5fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3b0764', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Radar size={22} color="#7c3aed" /> Rescue Radar
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#5b21b6' }}>
                  {geoListings.length > 0
                    ? `${geoListings.length} food source${geoListings.length > 1 ? 's' : ''} visible on the map. Click a marker to claim.`
                    : 'Enable location and browse listings to see food sources near you.'}
                </p>
              </div>
              <button
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="btn hover-pop"
                style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
              >
                <Navigation size={15} />
                {locationLoading ? 'Detecting...' : userLat ? 'Update Location' : 'Detect My Location'}
              </button>
            </div>
          </div>

          <div className="dash-section-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
            {loading ? (
              <Skeleton height="520px" />
            ) : (
              <MapView
                listings={listings}
                center={mapCenter}
                zoom={userLat && userLng ? 12 : 5}
                height="520px"
                userLocation={userLat && userLng ? { lat: parseFloat(userLat), lng: parseFloat(userLng), label: 'Your Location' } : null}
                onListingClick={openClaimModal}
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Available', value: listings.length, color: '#0f766e', bg: '#f0fdfa' },
              { label: 'On Map', value: geoListings.length, color: '#7c3aed', bg: '#ede9fe' },
              { label: 'FREE Food', value: listings.filter(l => l.priceType === 'FREE').length, color: '#047857', bg: '#ecfdf5' },
              { label: 'Expiring Soon', value: listings.filter(l => new Date(l.pickupDeadline) < new Date(Date.now() + 6 * 3600 * 1000)).length, color: '#b45309', bg: '#fffbeb' }
            ].map(stat => (
              <div key={stat.label} className="hover-pop" style={{ backgroundColor: stat.bg, borderRadius: '12px', padding: '1rem 1.25rem', border: `1px solid ${stat.color}20`, textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stat.color }}>
                  <AnimatedCounter value={stat.value} />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MY CLAIMS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activeClaims.length > 0 ? (
            activeClaims.map((claim) => {
              const delivery = deliveriesMap[claim._id];
              return (
                <div key={claim._id} className="dash-section-card hover-lift" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <Badge status={claim.status} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                        {claim.foodListingId?.title || 'Food Listing'}
                      </h3>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Provider: {claim.providerId?.name} {claim.providerId?.phone ? `· ${claim.providerId.phone}` : ''}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm hover-pop" onClick={() => handleCancelClaim(claim._id)}>
                      Cancel
                    </button>
                  </div>

                  {(claim.status !== 'PENDING' || delivery) && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f766e', margin: 0 }}>
                          Delivery & Pickup Tracking
                        </h4>
                        {['UNASSIGNED', 'ASSIGNED', 'PICKED_UP'].includes(delivery?.status) && (
                          <span style={{ fontSize: '0.72rem', color: '#0f766e', background: '#ccfbf1', padding: '0.2rem 0.55rem', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0f766e', display: 'inline-block' }} /> Live Updates
                          </span>
                        )}
                        {delivery?.status === 'DELIVERED' && (
                          <span style={{ fontSize: '0.72rem', color: '#047857', background: '#ecfdf5', padding: '0.2rem 0.55rem', borderRadius: '9999px', fontWeight: 700 }}>
                            Delivered
                          </span>
                        )}
                      </div>

                      <StatusTimeline currentStatus={delivery?.status || 'UNASSIGNED'} delivery={delivery} />

                      {delivery?.status === 'DELIVERED' && (
                        <div style={{ marginTop: '1rem', backgroundColor: '#f0fdfa', padding: '1rem', borderRadius: '10px', border: '1px solid #ccfbf1' }}>
                          <p style={{ fontSize: '0.9rem', color: '#0f766e', fontWeight: 700, marginBottom: '0.25rem' }}>
                            Food has been delivered by the volunteer!
                          </p>
                          {delivery.deliveredAt && (
                            <p style={{ fontSize: '0.78rem', color: '#0d9488', marginBottom: '0.75rem' }}>
                              Delivered at {new Date(delivery.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(delivery.deliveredAt).toLocaleDateString()})
                            </p>
                          )}
                          <button className="btn btn-primary btn-sm hover-pop" onClick={() => handleConfirmReceipt(delivery._id)}>
                            <Check size={16} /> Confirm Receipt (Complete Rescue)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="dash-empty-state">
              <div className="dash-empty-state-icon">
                <Heart size={28} color="#0f766e" />
              </div>
              <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No active claims</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Browse available food and submit a claim to get started.</p>
              <button className="btn btn-primary btn-sm hover-pop" onClick={() => setActiveTab('browse')}>
                Browse Food →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RESCUED HISTORY TAB ──────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {completedClaims.length > 0 ? (
            completedClaims.map((claim) => (
              <div key={claim._id} className="dash-section-card hover-lift" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Badge status="COMPLETED" />
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                      {claim.foodListingId?.title || 'Rescued Food Item'}
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Completed: {new Date(claim.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>
                    ✅ Rescued & Served
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="dash-empty-state">
              <div className="dash-empty-state-icon">
                <CheckCircle2 size={28} color="#059669" />
              </div>
              <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No completed rescues yet</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Your rescue history will appear here after completing food transfers.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Claim Request Modal ───────────────────────────────────────── */}
      <Modal isOpen={claimModalOpen} onClose={() => setClaimModalOpen(false)} title="Claim Food Listing" maxWidth="520px">
        {selectedListing && (
          <form onSubmit={handleClaimSubmit}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{selectedListing.title}</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Provider: {selectedListing.providerId?.name}</p>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f766e', marginTop: '0.5rem' }}>
                Pickup: {selectedListing.pickupCity || selectedListing.pickupAddress}
              </div>
              {selectedListing.distance !== undefined && selectedListing.distance !== null && (
                <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 700, marginTop: '0.3rem' }}>
                  📏 {selectedListing.distance} km from your location
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Notes for Food Provider (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Mention beneficiary details, expected pickup timing, or distribution plans..."
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary hover-pop" onClick={() => setClaimModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary hover-pop btn-shimmer" disabled={claimSubmitting}>
                {claimSubmitting ? 'Submitting Claim...' : 'Confirm Claim Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default SeekerDashboard;
