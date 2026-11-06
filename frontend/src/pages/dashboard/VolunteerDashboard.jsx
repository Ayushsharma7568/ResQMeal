import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout, getFoodImage } from '../../components/layout/DashboardLayout';
import { deliveryApi } from '../../api/deliveryApi';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { Skeleton } from '../../components/common/Skeleton';
import { StatusTimeline } from '../../components/common/StatusTimeline';
import { MapView } from '../../components/common/MapView';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { motion } from 'framer-motion';
import {
  Truck, MapPin, Clock, CheckCircle2, User, Building,
  ArrowRight, PackageCheck, AlertCircle, Phone, Navigation, Filter, Map as MapIcon, List, Package
} from 'lucide-react';

// Helper to reliably check if a delivery has no volunteer assigned
const isDeliveryUnassigned = (d) => {
  if (!d) return false;
  const status = String(d.status || '').toUpperCase();
  // Any delivery already assigned or progressed down the workflow is NOT unassigned
  if (['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'RECEIVED', 'CANCELLED'].includes(status)) {
    return false;
  }
  const vol = d.volunteer || d.volunteerId;
  if (vol) {
    if (typeof vol === 'string' && vol.trim().length > 0) return false;
    if (typeof vol === 'object' && (vol._id || Object.keys(vol).length > 0)) return false;
  }
  return true;
};

export const VolunteerDashboard = () => {
  // Initialize tab from URL hash if provided (#available or #my_tasks), defaulting to 'available'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (['available', 'my_tasks'].includes(hash)) return hash;
    }
    return 'available';
  });

  const [availableTasks, setAvailableTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [actionLoading, setActionLoading] = useState(false);
  const [acceptingTaskId, setAcceptingTaskId] = useState(null);

  // Volunteer Location & Distance Filter state
  const [volunteerLocation, setVolunteerLocation] = useState(null);
  const [maxDistanceFilter, setMaxDistanceFilter] = useState('');
  const [sortByNearest, setSortByNearest] = useState(true);
  const [locating, setLocating] = useState(false);

  // Auto-detect browser location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setToast({ message: 'Geolocation is not supported by your browser', type: 'error' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVolunteerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setToast({ message: 'Location updated! Showing distance to pickups.', type: 'success' });
      },
      () => {
        setLocating(false);
        setToast({ message: 'Could not fetch your position. Showing standard list.', type: 'warning' });
      },
      { timeout: 8000 }
    );
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params = {};
      if (volunteerLocation) {
        params.lat = volunteerLocation.lat;
        params.lng = volunteerLocation.lng;
        if (sortByNearest) params.sortByDistance = 'true';
      }
      if (maxDistanceFilter) {
        params.maxDistance = maxDistanceFilter;
      }

      const [availRes, myRes] = await Promise.all([
        deliveryApi.getAvailableTasks(params),
        deliveryApi.getMyAssignedTasks()
      ]);

      const rawAvailable = availRes?.data?.deliveries || availRes?.deliveries || (Array.isArray(availRes?.data) ? availRes.data : []);
      const rawMy = myRes?.data?.deliveries || myRes?.deliveries || (Array.isArray(myRes?.data) ? myRes.data : []);

      // Filter available unassigned tasks
      const unassignedTasks = rawAvailable.filter(d => isDeliveryUnassigned(d));
      // Ensure any unassigned items that appeared in myRes are also grouped properly
      rawMy.forEach(d => {
        if (isDeliveryUnassigned(d) && !unassignedTasks.some(t => t._id?.toString() === d._id?.toString())) {
          unassignedTasks.push(d);
        }
      });

      // Filter assigned tasks (tasks assigned to this volunteer)
      const assignedTasks = rawMy.filter(d => !isDeliveryUnassigned(d));

      setAvailableTasks(unassignedTasks);
      setMyTasks(assignedTasks);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load delivery tasks', type: 'error' });
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [volunteerLocation, maxDistanceFilter, sortByNearest]);

  // Initial fetch
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Background polling every 5s to keep available and assigned tasks synced
  // Never sets loading=true during polling so cards and buttons remain stable without flickering
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData(false);
    }, 5000);

    const handleFocus = () => {
      fetchData(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData]);

  // Listen for sidebar tab-change events & URL hash navigation
  useEffect(() => {
    const handleTabChange = (e) => {
      const tab = e.detail?.tab;
      if (tab === 'overview' || tab === 'default' || !tab) {
        setActiveTab('available');
      } else if (tab && ['available', 'my_tasks'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['available', 'my_tasks'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('dashboard-tab-change', handleTabChange);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('dashboard-tab-change', handleTabChange);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Accept Pickup Task — Immediately updates state and refreshes without manual reload
  const handleAcceptTask = async (id) => {
    setAcceptingTaskId(id);
    setActionLoading(true);
    try {
      const res = await deliveryApi.acceptTask(id);
      const acceptedDelivery = res.data?.data?.delivery || res.data?.delivery;

      // Optimistically move task from available to my_tasks immediately
      setAvailableTasks(prev => prev.filter(t => t._id !== id));
      if (acceptedDelivery) {
        setMyTasks(prev => [acceptedDelivery, ...prev.filter(t => t._id !== id)]);
      }

      setToast({ message: 'Pickup task accepted! Added to your active deliveries.', type: 'success' });
      setActiveTab('my_tasks');
      await fetchData(false);
    } catch (err) {
      setToast({ message: err.message || 'Failed to accept task (may be already claimed)', type: 'error' });
      await fetchData(false);
    } finally {
      setActionLoading(false);
      setAcceptingTaskId(null);
    }
  };

  // Mark Picked Up
  const handleMarkPickedUp = async (id) => {
    setActionLoading(true);
    try {
      await deliveryApi.markPickedUp(id);
      setToast({ message: 'Food marked as picked up! En route to recipient.', type: 'success' });
      fetchData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Delivered
  const handleMarkDelivered = async (id) => {
    const proof = window.prompt('Add delivery proof/note (e.g. Handed over to kitchen manager):');
    setActionLoading(true);
    try {
      await deliveryApi.markDelivered(id, { proofOfDelivery: proof || undefined });
      setToast({ message: 'Food marked as delivered! Awaiting seeker confirmation.', type: 'success' });
      fetchData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to mark as delivered', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Prepare listings/locations for Map display
  const mapListings = availableTasks.map(t => ({
    _id: t._id,
    title: t.foodListingId?.title || 'Pickup Task',
    quantity: t.foodListingId?.quantity || 1,
    unit: t.foodListingId?.unit || 'servings',
    category: t.foodListingId?.category || 'MEALS',
    providerName: t.providerId?.name || 'Food Provider',
    pickupAddress: t.pickupAddress,
    pickupLat: t.foodListingId?.pickupLat,
    pickupLng: t.foodListingId?.pickupLng,
    distanceKm: t.pickupDistance,
    status: t.status
  }));

  const activeDeliveries = myTasks.filter(t => t.status !== 'COMPLETED');
  const completedDeliveries = myTasks.filter(t => t.status === 'COMPLETED');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <DashboardLayout
      title="Volunteer Logistics Desk"
      subtitle="Accept nearby food pickup requests and deliver surplus meals to community organizations"
    >
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── KPI ROW ─────────────────────────────────────────────────── */}
      <motion.div
        className="dash-kpi-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[
          {
            label: 'Available Pickups',
            value: availableTasks.length,
            sub: 'Waiting for volunteers',
            icon: <Truck size={22} color="#0f766e" />,
            variant: 'teal',
            iconBg: 'rgba(204, 251, 241, 0.8)'
          },
          {
            label: 'My Active Deliveries',
            value: activeDeliveries.length,
            sub: 'In progress',
            icon: <Navigation size={22} color="#d97706" />,
            variant: 'amber',
            iconBg: 'rgba(254, 243, 199, 0.8)'
          },
          {
            label: 'Completed Rescues',
            value: completedDeliveries.length,
            sub: 'Successfully delivered',
            icon: <CheckCircle2 size={22} color="#059669" />,
            variant: 'green',
            iconBg: 'rgba(209, 250, 229, 0.8)'
          },
          {
            label: 'Total Assigned',
            value: myTasks.length,
            sub: 'All-time tasks',
            icon: <PackageCheck size={22} color="#7c3aed" />,
            variant: 'purple',
            iconBg: 'rgba(237, 233, 254, 0.8)'
          }
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={itemVariants}
            className={`dash-kpi-card dash-kpi-card--${kpi.variant} hover-lift`}
            onClick={() => kpi.label.includes('Available') ? setActiveTab('available') : setActiveTab('my_tasks')}
            style={{ cursor: 'pointer' }}
            title={`View ${kpi.label}`}
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

      {/* ── CONTROLS BAR ─────────────────────────────────────────────── */}
      <div className="dash-controls-bar">
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('available')}
            className={`dash-tab-btn ${activeTab === 'available' ? 'active' : ''}`}
            data-testid="tab-available-pickups"
            style={{
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '0.55rem 1rem'
            }}
          >
            <List size={16} />
            <span>Available Pickups</span>
            <span
              style={{
                background: activeTab === 'available' ? '#0f766e' : '#e2e8f0',
                color: activeTab === 'available' ? '#ffffff' : '#334155',
                padding: '0.15rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                lineHeight: 1.2
              }}
            >
              {availableTasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`dash-tab-btn ${activeTab === 'my_tasks' ? 'active' : ''}`}
            data-testid="tab-my-deliveries"
            style={{
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '0.55rem 1rem'
            }}
          >
            <Truck size={16} />
            <span>My Deliveries</span>
            <span
              style={{
                background: activeTab === 'my_tasks' ? '#0f766e' : '#e2e8f0',
                color: activeTab === 'my_tasks' ? '#ffffff' : '#334155',
                padding: '0.15rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                lineHeight: 1.2
              }}
            >
              {activeDeliveries.length}
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleDetectLocation}
            className="hover-pop"
            disabled={locating}
            style={{
              padding: '0.45rem 0.85rem', borderRadius: '8px',
              background: volunteerLocation ? '#f0fdf4' : '#f1f5f9',
              border: volunteerLocation ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
              color: volunteerLocation ? '#047857' : '#64748b',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Navigation size={14} color={volunteerLocation ? '#047857' : '#64748b'} />
            {locating ? 'Locating...' : volunteerLocation ? 'Location Active ✓' : 'Detect My Location'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={14} color="#64748b" />
            <select
              value={maxDistanceFilter}
              onChange={(e) => setMaxDistanceFilter(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff' }}
            >
              <option value="">Any distance</option>
              <option value="2">Within 2 km</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── AVAILABLE TASKS: Tasks LEFT + Map RIGHT ───────────────────── */}
      {activeTab === 'available' && (
        <div className="dash-split-55-45">
          {/* LEFT: Task Cards */}
          <div>
            <div className="dash-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 className="dash-section-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={20} color="#0f766e" />
                  Available Pickups
                </h2>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Food surplus rescue tasks waiting for volunteer pickup
                </span>
              </div>
              <span
                style={{
                  background: '#ccfbf1',
                  color: '#0f766e',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.82rem'
                }}
              >
                {availableTasks.length} {availableTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3].map(i => <Skeleton key={i} height="180px" />)}
              </div>
            ) : availableTasks.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="dash-scrollable-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  maxHeight: 'calc(100vh - 260px)',
                  minHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                {availableTasks.map((task, idx) => (
                  <motion.div key={task._id} variants={itemVariants} className="dash-food-card hover-lift" style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                    {/* Food Image */}
                    <div className="dash-food-card-img-wrap" style={{ height: '130px', position: 'relative' }}>
                      <img
                        src={getFoodImage(idx, task.foodListingId?.photoUrl)}
                        alt={task.foodListingId?.title || 'Pickup'}
                        loading="lazy"
                        onError={e => { e.target.src = getFoodImage(idx + 1); }}
                      />
                      <div className="dash-food-card-img-overlay" />
                      <div className="dash-food-card-img-badge">
                        <Badge status="UNASSIGNED" />
                      </div>
                      {task.pickupDistance !== undefined && task.pickupDistance !== null && (
                        <div
                          className="dash-food-card-img-price"
                          style={{ background: 'rgba(124, 58, 237, 0.85)', color: '#fff' }}
                        >
                          📍 {task.pickupDistance} km
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="dash-food-card-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                        {task.foodListingId?.title || 'Food Surplus Pickup'}
                      </h3>

                      <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '10px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <Building size={15} color="#0f766e" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <strong style={{ color: '#0f172a' }}>{task.providerId?.name || 'Demo Provider'}</strong>
                            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                              {task.foodListingId?.pickupCity
                                ? `${task.foodListingId.pickupCity}${task.foodListingId.pickupState ? `, ${task.foodListingId.pickupState}` : ''}`
                                : task.pickupAddress}
                            </div>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <User size={15} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <strong style={{ color: '#0f172a' }}>{task.seekerId?.name || 'Food Seeker'}</strong>
                            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{task.deliveryAddress || 'Address specified by seeker'}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={14} color="#d97706" />
                        <span>Deadline: {task.foodListingId?.pickupDeadline
                          ? new Date(task.foodListingId.pickupDeadline).toLocaleString()
                          : 'Within 24 Hours'}</span>
                      </div>

                      {/* Unconditional Accept Pickup — Assign to Me Button */}
                      <div style={{ marginTop: '0.25rem', position: 'relative', zIndex: 10 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm hover-pop btn-shimmer"
                          style={{
                            width: '100%',
                            background: acceptingTaskId === task._id
                              ? '#94a3b8'
                              : 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
                            color: '#ffffff',
                            padding: '0.75rem 1rem',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            letterSpacing: '0.01em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
                            position: 'relative',
                            zIndex: 10
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptTask(task._id);
                          }}
                          disabled={actionLoading}
                          data-testid={`accept-pickup-btn-${task._id}`}
                          aria-label="Accept Pickup — Assign to Me"
                        >
                          {acceptingTaskId === task._id ? (
                            <><Clock size={16} className="spin-animation" /> Assigning to You...</>
                          ) : (
                            <><Truck size={17} /> ✋ Accept Pickup — Assign to Me</>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="dash-empty-state">
                <div className="dash-empty-state-icon">
                  <Truck size={28} color="#0f766e" />
                </div>
                <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No available pickups</p>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  No tasks matching your filters. Try expanding distance or check back soon!
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Map Radar — sticky */}
          <div className="dash-map-sticky-panel">
            <div className="dash-section-card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
              <div className="dash-section-header">
                <span className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapIcon size={18} color="#0f766e" /> Pickup Map Radar
                </span>
                <span className="dash-section-count">{mapListings.filter(l => l.pickupLat).length} plotted</span>
              </div>

              {!volunteerLocation && (
                <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Navigation size={14} />
                  Enable location to see distances
                  <button onClick={handleDetectLocation} disabled={locating}
                    style={{ marginLeft: 'auto', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}>
                    {locating ? '...' : 'Enable'}
                  </button>
                </div>
              )}

              <div className="dash-map-wide" style={{ height: '440px' }}>
                {loading ? (
                  <Skeleton height="440px" />
                ) : (
                  <MapView
                    listings={mapListings}
                    userLocation={volunteerLocation}
                    onSelectListing={(task) => handleAcceptTask(task._id)}
                    height="440px"
                  />
                )}
              </div>

              <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f172a' }}>💡 Tip:</strong> Click a map marker to accept that pickup task instantly.
                {volunteerLocation && <span style={{ color: '#0f766e', fontWeight: 700 }}> Your location is active.</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MY ASSIGNED DELIVERIES TAB ────────────────────────────────── */}
      {activeTab === 'my_tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {myTasks.length > 0 ? (
            myTasks.map((task) => (
              <div key={task._id} className="dash-section-card hover-lift" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <Badge status={task.status} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                      {task.foodListingId?.title || 'Assigned Food Transfer'}
                    </h3>
                  </div>
                </div>

                {/* Status Timeline */}
                <div style={{ margin: '1rem 0', backgroundColor: '#fdfbf7', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f766e', marginBottom: '0.5rem' }}>
                    Delivery Workflow: {task.status}
                  </div>
                  <StatusTimeline currentStatus={task.status} delivery={task} />
                </div>

                {/* Location Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#f0fdfa', borderRadius: '10px', border: '1px solid #ccfbf1' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      📍 Pickup Location
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{task.providerId?.name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{task.pickupAddress}</div>
                    {task.providerId?.phone && (
                      <div style={{ fontSize: '0.8rem', color: '#0f766e', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Phone size={13} /> {task.providerId.phone}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #d1fae5' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      🏠 Delivery Destination
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{task.seekerId?.name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{task.deliveryAddress}</div>
                    {task.seekerId?.phone && (
                      <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Phone size={13} /> {task.seekerId.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Map snippet for active delivery */}
                {task.foodListingId?.pickupLat && task.foodListingId?.pickupLng && (
                  <div style={{ margin: '1rem 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                    <div style={{ padding: '0.5rem 1rem', background: '#f1f5f9', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                      🗺️ Route Map Preview
                    </div>
                    <MapView
                      listings={[{
                        _id: task._id,
                        title: `Pickup: ${task.foodListingId.title}`,
                        providerName: task.providerId?.name,
                        pickupLat: task.foodListingId.pickupLat,
                        pickupLng: task.foodListingId.pickupLng
                      }]}
                      height="220px"
                    />
                  </div>
                )}

                {/* Workflow Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {isDeliveryUnassigned(task) && (
                    <button
                      className="btn btn-primary hover-pop btn-shimmer"
                      onClick={() => handleAcceptTask(task._id)}
                      disabled={actionLoading}
                    >
                      <Truck size={16} /> ✋ Accept Pickup — Assign to Me
                    </button>
                  )}

                  {task.status === 'ASSIGNED' && (
                    <button className="btn btn-primary hover-pop btn-shimmer" onClick={() => handleMarkPickedUp(task._id)} disabled={actionLoading}>
                      <Truck size={16} /> Mark Food as Picked Up (In Transit)
                    </button>
                  )}

                  {['PICKED_UP', 'IN_TRANSIT'].includes(task.status) && (
                    <>
                      <span style={{ fontSize: '0.8rem', color: '#0f766e', background: '#ccfbf1', padding: '0.35rem 0.75rem', borderRadius: '8px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Truck size={14} /> In Transit to Seeker
                      </span>
                      <button
                        className="btn btn-primary hover-pop btn-shimmer"
                        onClick={() => handleMarkDelivered(task._id)}
                        disabled={actionLoading}
                        style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                      >
                        <PackageCheck size={16} /> Mark Food as Delivered
                      </button>
                    </>
                  )}

                  {task.status === 'DELIVERED' && (
                    <div style={{ fontSize: '0.9rem', color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={18} /> Delivered! Waiting for food seeker to confirm receipt.
                    </div>
                  )}

                  {task.status === 'COMPLETED' && (
                    <div style={{ fontSize: '0.9rem', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={18} /> Transfer Fully Completed & Verified ✅
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="dash-empty-state">
              <div className="dash-empty-state-icon">
                <Truck size={28} color="#0f766e" />
              </div>
              <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No active deliveries</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Accept an available pickup to get started!
              </p>
              <button className="btn btn-primary btn-sm hover-pop" onClick={() => setActiveTab('available')}>
                Browse Available Pickups →
              </button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default VolunteerDashboard;
