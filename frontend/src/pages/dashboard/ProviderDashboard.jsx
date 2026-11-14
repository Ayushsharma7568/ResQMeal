import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout, getFoodImage } from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../utils/socket';
import { listingApi } from '../../api/listingApi';
import { claimApi } from '../../api/claimApi';
import { deliveryApi } from '../../api/deliveryApi';
import { aiApi } from '../../api/aiApi';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Toast } from '../../components/common/Toast';
import { Skeleton } from '../../components/common/Skeleton';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { ImpactAnalyticsSection } from '../../components/dashboard/ImpactAnalyticsSection';
import { toLocalDatetimeInputString, serializeLocalDatetimeToISO, formatDisplayDate } from '../../utils/dateUtils';
import { motion } from 'framer-motion';
import {
  PlusCircle, Package, CheckCircle2, Clock, MapPin,
  Trash2, Edit3, Check, X, AlertCircle, Eye, Tag, Utensils, Sparkles,
  TrendingUp, Activity, ArrowRight, Zap, Gift
} from 'lucide-react';

export const ProviderDashboard = () => {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState([]);
  const [incomingClaims, setIncomingClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // AI Assistant raw text input state
  const [aiText, setAiText] = useState('');
  const [aiParsing, setAiParsing] = useState(false);

  // Section refs for sidebar scroll-to navigation
  const claimsSectionRef = useRef(null);
  const listingsSectionRef = useRef(null);

  // Listing Form State
  const initialForm = {
    title: '',
    description: '',
    priceType: 'FREE',
    price: 0,
    pickupAddress: '',
    pickupCity: '',
    pickupState: '',
    pickupPincode: '',
    pickupInstructions: '',
    availableFrom: toLocalDatetimeInputString(new Date()),
    pickupDeadline: toLocalDatetimeInputString(new Date(Date.now() + 4 * 60 * 60 * 1000)),
    photoUrl: '',
    foodItems: [
      {
        name: '',
        category: 'COOKED_FOOD',
        quantity: 5,
        unit: 'kg',
        foodType: 'VEG',
        allergens: '',
        dietaryInfo: ''
      }
    ]
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listingsRes, claimsRes] = await Promise.all([
        listingApi.getMyListings(),
        claimApi.getIncomingClaims()
      ]);
      setMyListings(listingsRes.data?.listings || []);
      setIncomingClaims(claimsRes.data?.claims || []);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load dashboard data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-Time Socket.io: Live Incoming Claim Notifications
  useEffect(() => {
    const socket = getSocket();

    const handleClaimCreated = (payload) => {
      if (!payload || !payload.claim) return;
      const { claim, providerId } = payload;
      const currentUserId = user?._id?.toString() || user?.id?.toString();

      // Check if this claim belongs to the logged-in provider
      const isTargetProvider =
        (providerId && currentUserId && providerId.toString() === currentUserId) ||
        (claim.providerId && (
          claim.providerId._id?.toString() === currentUserId ||
          claim.providerId.toString() === currentUserId
        ));

      if (isTargetProvider) {
        setIncomingClaims(prev => {
          if (prev.some(c => c._id?.toString() === claim._id?.toString())) {
            return prev;
          }
          return [claim, ...prev];
        });
        setToast({
          message: `New claim request received for "${claim.foodListingId?.title || 'your food surplus'}"!`,
          type: 'info'
        });
      }
    };

    const handleClaimCancelled = (payload) => {
      if (!payload) return;
      const claimId = payload.claimId || payload.claim?._id;
      if (!claimId) return;
      setIncomingClaims(prev => prev.map(c => {
        if (c._id?.toString() === claimId.toString()) {
          return { ...c, status: 'CANCELLED' };
        }
        return c;
      }));
    };

    socket.on('claim:created', handleClaimCreated);
    socket.on('claim:cancelled', handleClaimCancelled);
    socket.on('dispatch:escalation', (payload) => {
      if (!payload || !payload.listingId) return;
      setMyListings(prev => prev.map(l => {
        if (l._id?.toString() === payload.listingId.toString()) {
          return {
            ...l,
            escalationTier: payload.tier,
            isCriticalRescue: payload.isCriticalRescue,
            currentRadiusKm: payload.currentRadiusKm
          };
        }
        return l;
      }));
    });

    return () => {
      socket.off('claim:created', handleClaimCreated);
      socket.off('claim:cancelled', handleClaimCancelled);
      socket.off('dispatch:escalation');
    };
  }, [user]);

  // Listen for sidebar tab-change events to scroll to sections
  useEffect(() => {
    const handleTabChange = (e) => {
      const tab = e.detail?.tab;
      if (tab === 'claims' && claimsSectionRef.current) {
        claimsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tab === 'listings' && listingsSectionRef.current) {
        listingsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tab === 'overview' || !tab) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('dashboard-tab-change', handleTabChange);
    return () => window.removeEventListener('dashboard-tab-change', handleTabChange);
  }, []);

  // AI Smart Assistant — Text Parser Handler
  const handleAiParse = async () => {
    if (!aiText.trim()) {
      setToast({ message: 'Please enter raw surplus details to auto-fill', type: 'warning' });
      return;
    }
    setAiParsing(true);
    try {
      const res = await aiApi.parseListing(aiText);
      const parsed = res.data;
      if (parsed) {
        setFormData(prev => ({
          ...prev,
          title: parsed.suggestedTitle || parsed.title || prev.title,
          priceType: parsed.suggestedPriceType || parsed.priceType || prev.priceType,
          price: (parsed.suggestedPrice !== undefined && parsed.suggestedPrice !== null)
            ? parsed.suggestedPrice
            : (parsed.price !== undefined && parsed.price !== null ? parsed.price : prev.price),
          pickupCity: parsed.suggestedCity || parsed.pickupCity || prev.pickupCity,
          pickupAddress: parsed.suggestedAddress || parsed.pickupAddress || prev.pickupAddress,
          foodItems: (parsed.foodItems && parsed.foodItems.length > 0) ? parsed.foodItems.map(item => ({
            name: item.name || 'Surplus Item',
            category: item.category || 'COOKED_FOOD',
            quantity: item.quantity || 1,
            unit: item.unit || 'servings',
            foodType: item.foodType || 'VEG',
            allergens: '',
            dietaryInfo: ''
          })) : prev.foodItems
        }));
        setToast({ message: 'AI Smart Fill complete! Review and adjust details below.', type: 'success' });
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to parse text with AI', type: 'error' });
    } finally {
      setAiParsing(false);
    }
  };

  // Food Item handlers
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.foodItems];
    updatedItems[index][field] = value;
    setFormData({ ...formData, foodItems: updatedItems });
  };

  const addFoodItem = () => {
    setFormData({
      ...formData,
      foodItems: [
        ...formData.foodItems,
        { name: '', category: 'COOKED_FOOD', quantity: 1, unit: 'kg', foodType: 'VEG', allergens: '', dietaryInfo: '' }
      ]
    });
  };

  const removeFoodItem = (index) => {
    if (formData.foodItems.length === 1) return;
    const updatedItems = formData.foodItems.filter((_, i) => i !== index);
    setFormData({ ...formData, foodItems: updatedItems });
  };

  // Submit Create Listing
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      // Sanitize payload to match backend schema enums
      const sanitizedData = {
        ...formData,
        availableFrom: serializeLocalDatetimeToISO(formData.availableFrom),
        pickupDeadline: serializeLocalDatetimeToISO(formData.pickupDeadline),
        foodItems: formData.foodItems.map(item => ({
          name: item.name,
          category: item.category,
          quantity: Number(item.quantity),
          unit: item.unit,
          foodType: item.foodType,
          allergens: Array.isArray(item.allergens) ? item.allergens : (item.allergens ? [item.allergens] : []),
          dietaryInfo: Array.isArray(item.dietaryInfo) ? item.dietaryInfo : (item.dietaryInfo ? [item.dietaryInfo] : [])
        }))
      };
      await listingApi.createListing(sanitizedData);
      setToast({ message: 'Surplus food listing created successfully!', type: 'success' });
      setIsCreateOpen(false);
      setFormData(initialForm);
      setAiText('');
      fetchData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to create listing', type: 'error' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Claim Approval Handler
  const handleApproveClaim = async (claimId) => {
    try {
      await claimApi.approveClaim(claimId);
      setToast({ message: 'Claim approved! Delivery task initiated.', type: 'success' });
      fetchData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to approve claim', type: 'error' });
    }
  };

  // Claim Rejection Handler
  const handleRejectClaim = async (claimId) => {
    const reason = window.prompt('Enter rejection reason for NGO:');
    if (reason === null) return;
    try {
      await claimApi.rejectClaim(claimId, { rejectionReason: reason || 'Not available' });
      setToast({ message: 'Claim rejected.', type: 'info' });
      fetchData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to reject claim', type: 'error' });
    }
  };

  // Cancel Listing Handler
  const handleCancelListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to cancel this surplus food listing?')) return;
    try {
      await listingApi.deleteListing(listingId);
      setToast({ message: 'Listing cancelled.', type: 'info' });
      fetchData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to cancel listing', type: 'error' });
    }
  };

  const activeListingsCount = myListings.filter(l => l.status === 'AVAILABLE').length;
  const pendingClaimsCount = incomingClaims.filter(c => c.status === 'PENDING').length;
  const completedListingsCount = myListings.filter(l => l.status === 'COMPLETED').length;
  const totalListingsCount = myListings.length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } }
  };

  const kpiCards = [
    {
      label: 'Active Listings',
      value: activeListingsCount,
      sub: 'Ready for claim',
      icon: <Package size={22} color="#0f766e" />,
      variant: 'teal',
      iconBg: 'rgba(204, 251, 241, 0.8)'
    },
    {
      label: 'Pending Claims',
      value: pendingClaimsCount,
      sub: 'Awaiting your response',
      icon: <AlertCircle size={22} color="#d97706" />,
      variant: 'amber',
      iconBg: 'rgba(254, 243, 199, 0.8)'
    },
    {
      label: 'Successful Transfers',
      value: completedListingsCount,
      sub: 'Rescued & delivered',
      icon: <CheckCircle2 size={22} color="#059669" />,
      variant: 'green',
      iconBg: 'rgba(209, 250, 229, 0.8)'
    },
    {
      label: 'Total Listed',
      value: totalListingsCount,
      sub: 'All-time listings',
      icon: <TrendingUp size={22} color="#7c3aed" />,
      variant: 'purple',
      iconBg: 'rgba(237, 233, 254, 0.8)'
    }
  ];

  return (
    <DashboardLayout
      title="Provider Food Portal"
      subtitle="Manage your surplus food listings and respond to incoming claims from verified community organizations"
      actions={
        <button className="btn btn-primary hover-pop btn-shimmer" onClick={() => setIsCreateOpen(true)}>
          <PlusCircle size={18} />
          List Surplus Food
        </button>
      }
    >
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── KPI ROW ─────────────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="dash-kpi-grid"
      >
        {kpiCards.map((kpi, idx) => (
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

      {/* ── LARGE CTA BANNER ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="dash-cta-banner"
      >
        <div style={{ zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Gift size={20} color="rgba(255,255,255,0.9)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Make an Impact Today
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', margin: '0 0 0.4rem' }}>
            Turn surplus food into rescued meals
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            List your surplus food in under 60 seconds. Community NGOs are waiting.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          style={{
            flexShrink: 0, zIndex: 1,
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(255,255,255,0.35)',
            color: '#ffffff', fontWeight: 800, fontSize: '0.95rem',
            padding: '0.85rem 1.75rem', borderRadius: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.26)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
        >
          <PlusCircle size={20} />
          + List Surplus Food
        </button>
      </motion.div>

      {/* ── ROLE-BASED IMPACT & SUSTAINABILITY ANALYTICS ─────────────── */}
      <ImpactAnalyticsSection refreshTrigger={completedListingsCount} />

      {/* ── MAIN CONTENT: 60/40 SPLIT ────────────────────────────────── */}
      <motion.div
        className="dash-split-60-40"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        {/* LEFT 60%: Incoming Claims */}
        <div ref={claimsSectionRef}>
          <div className="dash-section-card" style={{ padding: '1.5rem' }}>
            <div className="dash-section-header">
              <span className="dash-section-title">Incoming Claims from NGOs</span>
              <span className="dash-section-count">{incomingClaims.length} Claims</span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2].map(i => <Skeleton key={i} height="130px" />)}
              </div>
            ) : incomingClaims.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {incomingClaims.map((claim) => (
                  <motion.div
                    key={claim._id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="hover-lift"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '14px',
                      background: claim.status === 'PENDING'
                        ? 'linear-gradient(135deg, #fffbeb 0%, #fef9ec 100%)'
                        : '#f8fafc',
                      border: claim.status === 'PENDING' ? '1px solid rgba(253, 230, 138, 0.7)' : '1px solid #e2e8f0',
                      borderLeft: claim.status === 'PENDING' ? '4px solid #d97706' : '4px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {claim.foodListingId?.title || 'Food Listing'}
                        </h4>
                        <span style={{ fontSize: '0.82rem', color: '#0f766e', fontWeight: 700 }}>
                          By {claim.seekerId?.name || 'NGO Seeker'}
                        </span>
                      </div>
                      <Badge status={claim.status} />
                    </div>

                    {claim.notes && (
                      <p style={{ fontSize: '0.82rem', color: '#475569', background: 'rgba(255,255,255,0.7)', padding: '0.5rem 0.75rem', borderRadius: '8px', margin: '0.5rem 0', fontStyle: 'italic' }}>
                        "{claim.notes}"
                      </p>
                    )}

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={12} />
                      Requested: {formatDisplayDate(claim.createdAt)}
                    </div>

                    {claim.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm hover-pop" onClick={() => handleApproveClaim(claim._id)} style={{ flex: 1 }}>
                          <Check size={15} /> Approve
                        </button>
                        <button className="btn btn-secondary btn-sm hover-pop" onClick={() => handleRejectClaim(claim._id)} style={{ color: '#dc2626' }}>
                          <X size={15} /> Reject
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="dash-empty-state">
                <div className="dash-empty-state-icon">
                  <Package size={28} color="#0f766e" />
                </div>
                <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No incoming claims yet</p>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Claims from NGOs will appear here once you list surplus food.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 40%: My Surplus Listings */}
        <div ref={listingsSectionRef}>
          <div className="dash-section-card" style={{ padding: '1.5rem' }}>
            <div className="dash-section-header">
              <span className="dash-section-title">My Surplus Listings</span>
              <span className="dash-section-count">{myListings.length} Total</span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2].map(i => <Skeleton key={i} height="200px" />)}
              </div>
            ) : myListings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {myListings.map((listing, idx) => (
                  <motion.div
                    key={listing._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.06 }}
                    className="dash-food-card"
                  >
                    {/* Food Image */}
                    <div className="dash-food-card-img-wrap">
                      <img
                        src={getFoodImage(idx, listing.photoUrl)}
                        alt={listing.title}
                        loading="lazy"
                        onError={e => { e.target.src = getFoodImage(idx + 1); }}
                      />
                      <div className="dash-food-card-img-overlay" />
                      <div className="dash-food-card-img-badge">
                        <Badge status={listing.status} />
                      </div>
                      <div
                        className="dash-food-card-img-price"
                        style={{
                          background: listing.priceType === 'FREE' ? 'rgba(5, 150, 105, 0.85)' : 'rgba(180, 83, 9, 0.85)',
                          color: '#ffffff'
                        }}
                      >
                        {listing.priceType === 'FREE' ? '🟢 FREE' : `₹${listing.price}`}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="dash-food-card-body">
                      {/* Active Dispatch Queue Indicator */}
                      {(listing.isCriticalRescue || (listing.escalationTier && listing.escalationTier >= 2) || (listing.pickupDeadline && new Date(listing.pickupDeadline).getTime() - Date.now() <= 45 * 60 * 1000)) && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.73rem',
                            fontWeight: 800,
                            background: (listing.isCriticalRescue || (listing.pickupDeadline && new Date(listing.pickupDeadline).getTime() - Date.now() <= 45 * 60 * 1000)) ? '#fee2e2' : '#fef3c7',
                            color: (listing.isCriticalRescue || (listing.pickupDeadline && new Date(listing.pickupDeadline).getTime() - Date.now() <= 45 * 60 * 1000)) ? '#b91c1c' : '#92400e',
                            border: `1px solid ${(listing.isCriticalRescue || (listing.pickupDeadline && new Date(listing.pickupDeadline).getTime() - Date.now() <= 45 * 60 * 1000)) ? '#fca5a5' : '#fde68a'}`,
                            marginBottom: '0.45rem'
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: (listing.isCriticalRescue || (listing.pickupDeadline && new Date(listing.pickupDeadline).getTime() - Date.now() <= 45 * 60 * 1000)) ? '#ef4444' : '#f59e0b',
                              display: 'inline-block'
                            }}
                          />
                          <span>
                            Active Dispatch Queue: {(listing.isCriticalRescue || (listing.pickupDeadline && new Date(listing.pickupDeadline).getTime() - Date.now() <= 45 * 60 * 1000))
                              ? `Tier 3 — Critical Rescue (${listing.currentRadiusKm || 10}km)`
                              : `Tier ${listing.escalationTier || 2} — Escalated (${listing.currentRadiusKm || 5}km)`}
                          </span>
                        </div>
                      )}

                      <h4 style={{ fontSize: '0.97rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                        {listing.title}
                      </h4>

                      {listing.description && (
                        <p style={{
                          fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem', lineHeight: 1.4,
                          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                        }}>
                          {listing.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', color: '#475569', marginBottom: '0.85rem', backgroundColor: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '9px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={13} color="#0f766e" />
                          <span>Deadline: {formatDisplayDate(listing.pickupDeadline)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <MapPin size={13} color="#0f766e" />
                          <span>{listing.pickupAddress}{listing.pickupCity ? ` (${listing.pickupCity})` : ''}</span>
                        </div>
                      </div>

                      {listing.status === 'AVAILABLE' && (
                        <button
                          className="btn btn-secondary btn-sm hover-pop"
                          onClick={() => handleCancelListing(listing._id)}
                          style={{ color: '#dc2626', width: '100%', fontSize: '0.82rem' }}
                        >
                          <Trash2 size={14} /> Cancel Listing
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="dash-empty-state">
                <div className="dash-empty-state-icon">
                  <PlusCircle size={28} color="#0f766e" />
                </div>
                <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No surplus listed yet</p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                  Your next rescued meal starts here.
                </p>
                <button className="btn btn-primary btn-sm hover-pop" onClick={() => setIsCreateOpen(true)}>
                  List Your First Item
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Multi-Item Surplus Food Listing Modal ──────────────────── */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="List Surplus Food Item(s)" maxWidth="680px">

        {/* AI Smart Assistant Text-to-Form Section */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#15803d', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            <Sparkles size={16} /> AI Smart Listing Assistant
          </div>
          <p style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.6rem' }}>
            Paste raw surplus details (e.g. <em>"50 rotis, 3 kg dal, 4 kg aloo sabzi prepared at 6 PM"</em>) to auto-fill the structured items below.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.85rem', flex: 1, backgroundColor: '#ffffff' }}
              placeholder="e.g. 50 rotis, 3 kg dal, 4 kg aloo sabzi"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm hover-pop"
              onClick={handleAiParse}
              disabled={aiParsing}
              style={{ background: '#15803d', borderColor: '#15803d', whiteSpace: 'nowrap' }}
            >
              {aiParsing ? 'Parsing...' : '✨ Auto-Fill'}
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label className="form-label">Listing Title</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Fresh Dinner Buffet Surplus (Rice, Curry & Salad)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Special Notes</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Provide details on preparation, packaging, and handling..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Pricing & Dates Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Price Type</label>
              <select
                className="form-select"
                value={formData.priceType}
                onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
              >
                <option value="FREE">FREE (Donation)</option>
                <option value="ONE_THIRD">ONE_THIRD (Nominal Recovery)</option>
                <option value="HALF">HALF (50% Off Recovery)</option>
                <option value="CUSTOM">CUSTOM (Specific Price)</option>
              </select>
            </div>

            {formData.priceType !== 'FREE' && (
              <div className="form-group">
                <label className="form-label">Price (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="form-input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Available From</label>
              <input
                type="datetime-local"
                required
                className="form-input"
                value={formData.availableFrom}
                onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pickup Deadline</label>
              <input
                type="datetime-local"
                required
                className="form-input"
                value={formData.pickupDeadline}
                onChange={(e) => setFormData({ ...formData, pickupDeadline: e.target.value })}
              />
            </div>
          </div>

          {/* Pickup Address */}
          <div className="form-group">
            <label className="form-label">Pickup Street Address</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Kitchen Entrance, 123 Commercial Street"
              value={formData.pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                placeholder="Bangalore"
                value={formData.pickupCity}
                onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Photo URL (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://..."
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
              />
            </div>
          </div>

          {/* Dynamic Food Items Sub-Form */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Food Items Included</h4>
              <button type="button" className="btn btn-secondary btn-sm hover-pop" onClick={addFoodItem}>
                <PlusCircle size={14} /> Add Another Item
              </button>
            </div>

            {formData.foodItems.map((item, index) => (
              <div key={index} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f766e' }}>Item #{index + 1}</span>
                  {formData.foodItems.length > 1 && (
                    <button type="button" onClick={() => removeFoodItem(index)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Item Name (e.g. Basmati Rice)"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    required
                    className="form-input"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  />
                  <select
                    className="form-select"
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="servings">servings</option>
                    <option value="pieces">pieces</option>
                    <option value="plates">plates</option>
                    <option value="boxes">boxes</option>
                    <option value="packets">packets</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <select
                    className="form-select"
                    value={item.category}
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                  >
                    <option value="COOKED_FOOD">Cooked Food / Meals</option>
                    <option value="BAKERY">Bakery & Breads</option>
                    <option value="FRUITS_VEGETABLES">Fruits & Vegetables</option>
                    <option value="DAIRY">Dairy & Milk</option>
                    <option value="PACKAGED_FOOD">Packaged Goods</option>
                    <option value="BEVERAGES">Beverages</option>
                    <option value="OTHER">Other</option>
                  </select>

                  <select
                    className="form-select"
                    value={item.foodType}
                    onChange={(e) => handleItemChange(index, 'foodType', e.target.value)}
                  >
                    <option value="VEG">Vegetarian (VEG)</option>
                    <option value="NON_VEG">Non-Vegetarian</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary hover-pop" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary hover-pop btn-shimmer" disabled={formSubmitting}>
              {formSubmitting ? 'Creating Listing...' : 'Publish Surplus Listing'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default ProviderDashboard;
