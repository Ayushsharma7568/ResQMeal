import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../api/adminApi';
import { analyticsApi } from '../../api/analyticsApi';
import { listingApi } from '../../api/listingApi';
import { claimApi } from '../../api/claimApi';
import { deliveryApi } from '../../api/deliveryApi';
import { aiApi } from '../../api/aiApi';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { Toast } from '../../components/common/Toast';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { ImpactAnalyticsSection } from '../../components/dashboard/ImpactAnalyticsSection';
import { motion } from 'framer-motion';
import {
  Shield, Users, Package, Heart, Truck, Search,
  Filter, CheckCircle2, Info, AlertTriangle, FileText, Sparkles, Send,
  TrendingUp, BarChart2, Activity, Award, UserCheck, RefreshCw, MapPin,
  ArrowLeft, ArrowRight, ToggleLeft, ToggleRight, Check, X, ShieldAlert
} from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'listings' | 'deliveries' | 'analytics'
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [listingStatusFilter, setListingStatusFilter] = useState('ALL');

  // AI Analytics State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  // Tab navigation helper with URL and sidebar synchronization
  const navigateToTab = (tabId) => {
    setActiveTab(tabId);
    window.dispatchEvent(new CustomEvent('dashboard-tab-change', { detail: { tab: tabId } }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [listingsRes, usersRes, deliveriesRes, claimsRes, analyticsRes, insightsRes] = await Promise.all([
        adminApi.getListings({ limit: 100 }).catch(() => listingApi.getListings({ limit: 100 })),
        adminApi.getUsers({ limit: 100 }).catch(() => ({ data: { users: [] } })),
        adminApi.getDeliveries({ limit: 100 }).catch(() => deliveryApi.getAvailableTasks({ limit: 100 })),
        adminApi.getClaims({ limit: 100 }).catch(() => claimApi.getIncomingClaims({ limit: 100 })),
        adminApi.getAnalytics().catch(() => null),
        aiApi.getInsights().catch(() => null)
      ]);

      const fetchedListings = listingsRes.data?.listings || listingsRes.data?.data?.listings || [];
      const fetchedUsers = usersRes.data?.users || usersRes.data?.data?.users || [];
      const fetchedDeliveries = deliveriesRes.data?.deliveries || deliveriesRes.data?.data?.deliveries || [];
      const fetchedClaims = claimsRes.data?.claims || claimsRes.data?.data?.claims || [];

      setListings(fetchedListings);
      setUsers(fetchedUsers);
      setDeliveries(fetchedDeliveries);
      setClaims(fetchedClaims);

      if (analyticsRes?.data?.data) {
        setAnalyticsData(analyticsRes.data.data);
      }
      if (insightsRes?.data) {
        setInsights(insightsRes.data);
      }
    } catch (err) {
      setToast({ message: err.message || 'Error loading platform administration data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Listen for sidebar tab-change events
  useEffect(() => {
    const handleTabChange = (e) => {
      const tab = e.detail?.tab;
      if (tab === 'overview' || tab === 'default' || !tab) {
        setActiveTab('overview');
      } else if (tab && ['overview', 'users', 'listings', 'deliveries', 'analytics', 'claims', 'ai_assistant'].includes(tab)) {
        setActiveTab(tab === 'claims' || tab === 'ai_assistant' ? 'analytics' : tab);
      }
    };
    window.addEventListener('dashboard-tab-change', handleTabChange);
    return () => window.removeEventListener('dashboard-tab-change', handleTabChange);
  }, []);

  // User Management Actions
  const handleToggleUserStatus = async (userItem) => {
    try {
      const newStatus = !userItem.isActive;
      await adminApi.updateUser(userItem._id, { isActive: newStatus });
      setUsers(prev => prev.map(u => u._id === userItem._id ? { ...u, isActive: newStatus } : u));
      setToast({ message: `${userItem.name}'s account is now ${newStatus ? 'Active' : 'Deactivated'}`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to update user status', type: 'error' });
    }
  };

  const handleRoleChange = async (userItem, newRole) => {
    try {
      await adminApi.updateUser(userItem._id, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userItem._id ? { ...u, role: newRole } : u));
      setToast({ message: `Updated ${userItem.name}'s role to ${newRole.replace('FOOD_', '')}`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to update user role', type: 'error' });
    }
  };

  // Food Listing Status Moderation
  const handleListingStatusChange = async (listingItem, newStatus) => {
    try {
      await adminApi.updateListing(listingItem._id, { status: newStatus });
      setListings(prev => prev.map(l => l._id === listingItem._id ? { ...l, status: newStatus } : l));
      setToast({ message: `Listing status updated to ${newStatus}`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to update listing status', type: 'error' });
    }
  };

  const handleAiQuerySubmit = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiApi.queryAnalytics(aiQuery);
      setAiResponse(res.data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to process AI query', type: 'error' });
    } finally {
      setAiLoading(false);
    }
  };

  // Compute Platform Metrics
  const totalListings = listings.length;
  const activeListings = listings.filter(l => l.status === 'AVAILABLE').length;
  const totalClaims = claims.length;
  const activeClaims = claims.filter(c => ['PENDING', 'APPROVED'].includes(c.status)).length;
  const successfulRescues = listings.filter(l => l.status === 'COMPLETED').length + claims.filter(c => c.status === 'COMPLETED').length;

  const totalFoodRescuedKg = listings
    .filter(l => ['COMPLETED', 'PICKED_UP', 'DELIVERED'].includes(l.status))
    .reduce((sum, listing) => {
      const itemSum = listing.foodItems?.reduce((iSum, item) => iSum + (parseFloat(item.quantity) || 1), 0) || 0;
      return sum + itemSum;
    }, 0);

  // Filter helpers
  const filteredListings = listings.filter(l => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      l.title.toLowerCase().includes(q) ||
      (l.pickupAddress && l.pickupAddress.toLowerCase().includes(q)) ||
      (l.pickupCity && l.pickupCity.toLowerCase().includes(q)) ||
      (l.providerId?.name && l.providerId.name.toLowerCase().includes(q));
    const matchesStatus = listingStatusFilter === 'ALL' || l.status === listingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.organizationName && u.organizationName.toLowerCase().includes(q)) ||
      (u.city && u.city.toLowerCase().includes(q));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredDeliveries = deliveries.filter(d => {
    const q = searchQuery.toLowerCase();
    return (
      (d.trackingCode && d.trackingCode.toLowerCase().includes(q)) ||
      (d.foodListingId?.title && d.foodListingId.title.toLowerCase().includes(q)) ||
      (d.volunteerId?.name && d.volunteerId.name.toLowerCase().includes(q)) ||
      (d.status && d.status.toLowerCase().includes(q)) ||
      (d.pickupAddress && d.pickupAddress.toLowerCase().includes(q))
    );
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  };

  const kpiCards = [
    { label: 'Total Listings', value: totalListings, sub: `${activeListings} active now`, icon: <Package size={20} color="#0f766e" />, variant: 'teal', iconBg: 'rgba(204, 251, 241, 0.8)', tab: 'listings' },
    { label: 'Platform Users', value: users.length, sub: `${users.filter(u => u.role === 'FOOD_PROVIDER').length} Providers, ${users.filter(u => u.role === 'FOOD_SEEKER').length} Seekers`, icon: <Users size={20} color="#059669" />, variant: 'green', iconBg: 'rgba(209, 250, 229, 0.8)', tab: 'users' },
    { label: 'Active Deliveries', value: deliveries.filter(d => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)).length, sub: `${deliveries.length} total tasks`, icon: <Truck size={20} color="#7c3aed" />, variant: 'purple', iconBg: 'rgba(237, 233, 254, 0.8)', tab: 'deliveries' },
    { label: 'Total Claims', value: totalClaims, sub: `${activeClaims} active`, icon: <FileText size={20} color="#d97706" />, variant: 'amber', iconBg: 'rgba(254, 243, 199, 0.8)', tab: 'overview' },
    { label: 'Food Rescued', value: Math.round(totalFoodRescuedKg), sub: 'Estimated kg', icon: <TrendingUp size={20} color="#1d4ed8" />, variant: 'blue', iconBg: 'rgba(219, 234, 254, 0.8)', tab: 'analytics' },
    { label: 'Verified Rescues', value: successfulRescues, sub: 'Completed transfers', icon: <Award size={20} color="#be123c" />, variant: 'rose', iconBg: 'rgba(254, 205, 211, 0.8)', tab: 'analytics' }
  ];

  // Common Back-to-Overview sub-view header component
  const SubViewHeader = ({ title, subtitle, count, countLabel = 'records' }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={() => navigateToTab('overview')}
          className="btn hover-pop"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 800,
            backgroundColor: '#f1f5f9',
            color: '#0f766e',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Back to Overview
        </button>
        <div>
          <span className="dash-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
            {title}
            {count !== undefined && (
              <span className="dash-section-count" style={{ fontSize: '0.75rem', padding: '0.15rem 0.55rem' }}>
                {count} {countLabel}
              </span>
            )}
          </span>
          {subtitle && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={fetchAdminData}
        className="btn hover-pop"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.45rem 0.75rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          backgroundColor: '#ffffff',
          color: '#0f766e',
          border: '1px solid #ccfbf1',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        <RefreshCw size={13} /> Refresh
      </button>
    </div>
  );

  return (
    <DashboardLayout
      title="Admin & Platform Governance"
      subtitle="Comprehensive platform overview, user roles management, food listings oversight, and impact auditing"
    >
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── 6 KPI CARDS ─────────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="dash-kpi-grid--6"
      >
        {kpiCards.map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={itemVariants}
            className={`dash-kpi-card dash-kpi-card--${kpi.variant} hover-pop`}
            onClick={() => navigateToTab(kpi.tab)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                {kpi.label}
              </div>
              <div className="dash-kpi-icon" style={{ background: kpi.iconBg, width: '36px', height: '36px', borderRadius: '10px' }}>
                {kpi.icon}
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1, marginBottom: '0.35rem', letterSpacing: '-0.03em' }}>
              {loading ? <Skeleton height="36px" width="60px" /> : <AnimatedCounter value={kpi.value} />}
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>{kpi.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── TABS BAR (BIDIRECTIONAL INTERACTIVE NAVIGATION) ───────────── */}
      <div className="dash-tabs-bar" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'overview', label: 'Overview', icon: <Shield size={15} /> },
          { id: 'users', label: 'User Management', icon: <Users size={15} />, count: users.length },
          { id: 'listings', label: 'Food Listings', icon: <Package size={15} />, count: listings.length },
          { id: 'deliveries', label: 'Deliveries & Logistics', icon: <Truck size={15} />, count: deliveries.length },
          { id: 'analytics', label: 'Impact Analytics', icon: <BarChart2 size={15} />, color: '#0f766e' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`dash-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => navigateToTab(tab.id)}
              style={isActive ? { color: tab.color || '#0f766e', fontWeight: 800 } : {}}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="dash-tab-btn-count">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 1. OVERVIEW TAB ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Sub-view Navigation Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              { id: 'users', title: 'Manage Users', desc: `${users.length} registered accounts`, icon: <Users size={20} color="#059669" />, bg: '#f0fdf4', border: '#bbf7d0' },
              { id: 'listings', title: 'Moderate Listings', desc: `${activeListings} available surplus posts`, icon: <Package size={20} color="#0f766e" />, bg: '#f0fdfa', border: '#99f6e4' },
              { id: 'deliveries', title: 'Track Deliveries', desc: `${deliveries.length} volunteer logistics runs`, icon: <Truck size={20} color="#7c3aed" />, bg: '#f5f3ff', border: '#ddd6fe' },
              { id: 'analytics', title: 'Impact Analytics', desc: `${Math.round(totalFoodRescuedKg)} kg rescued food metrics`, icon: <BarChart2 size={20} color="#d97706" />, bg: '#fffbeb', border: '#fde68a' }
            ].map(card => (
              <div
                key={card.id}
                onClick={() => navigateToTab(card.id)}
                className="hover-pop"
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  backgroundColor: card.bg,
                  border: `1px solid ${card.border}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{ padding: '0.65rem', borderRadius: '10px', backgroundColor: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  {card.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{card.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{card.desc}</div>
                </div>
                <ArrowRight size={16} color="#64748b" />
              </div>
            ))}
          </div>

          {/* Platform Impact & Sustainability Charts */}
          <ImpactAnalyticsSection refreshTrigger={successfulRescues} />

          {/* System Efficiency & Roles Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="dash-section-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="#0f766e" /> System Efficiency Metrics
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { label: 'Listing Completion Rate', value: totalListings > 0 ? `${Math.round((successfulRescues / totalListings) * 100)}%` : '0%', color: '#059669' },
                  { label: 'Avg Claims per Listing', value: totalListings > 0 ? (totalClaims / totalListings).toFixed(1) : '0', color: '#7c3aed' },
                  { label: 'Active Delivery Rate', value: totalClaims > 0 ? `${Math.round((activeClaims / totalClaims) * 100)}%` : '0%', color: '#d97706' },
                  { label: 'Registered Volunteers', value: users.filter(u => u.role === 'VOLUNTEER').length, color: '#0f766e' }
                ].map(stat => (
                  <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{stat.label}</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: stat.color }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-section-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="#7c3aed" /> Platform Roles Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { role: 'Food Providers', count: users.filter(u => u.role === 'FOOD_PROVIDER').length, color: '#0f766e', bg: '#f0fdfa' },
                  { role: 'Seeker NGOs', count: users.filter(u => u.role === 'FOOD_SEEKER').length, color: '#7c3aed', bg: '#f5f3ff' },
                  { role: 'Volunteers', count: users.filter(u => u.role === 'VOLUNTEER').length, color: '#059669', bg: '#f0fdf4' },
                  { role: 'System Admins', count: users.filter(u => u.role === 'ADMIN').length, color: '#be123c', bg: '#fff1f2' }
                ].map(r => (
                  <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: r.bg, borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 700 }}>{r.role}</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: r.color }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. USERS & ROLES MANAGEMENT SUB-VIEW ───────────────────────── */}
      {activeTab === 'users' && (
        <div className="dash-section-card" style={{ padding: '1.5rem' }}>
          <SubViewHeader
            title="User Management & Role Governance"
            subtitle="Manage registered Providers, Seekers, Volunteers, toggle active status, and assign roles"
            count={filteredUsers.length}
            countLabel="users"
          />

          {/* Search & Filter Toolbar */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
              {['ALL', 'FOOD_PROVIDER', 'FOOD_SEEKER', 'VOLUNTEER', 'ADMIN'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    border: 'none',
                    background: roleFilter === r ? '#ffffff' : 'transparent',
                    color: roleFilter === r ? '#0f766e' : '#64748b',
                    fontWeight: roleFilter === r ? 800 : 600,
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: roleFilter === r ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {r === 'ALL' ? 'All Roles' : r.replace('FOOD_', '')}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', maxWidth: '280px', fontSize: '0.85rem' }}
                placeholder="Search by name, email, org, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <Skeleton height="240px" />
          ) : filteredUsers.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['User', 'Contact', 'Role Assignment', 'Organization', 'City', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        <div>{u.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>ID: {u._id.slice(-6)}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                        <div>{u.email}</div>
                        {u.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.phone}</div>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            border: '1px solid #cbd5e1',
                            backgroundColor:
                              u.role === 'ADMIN' ? '#fee2e2' :
                              u.role === 'FOOD_PROVIDER' ? '#ccfbf1' :
                              u.role === 'FOOD_SEEKER' ? '#ede9fe' : '#dcfce7',
                            color:
                              u.role === 'ADMIN' ? '#991b1b' :
                              u.role === 'FOOD_PROVIDER' ? '#0f766e' :
                              u.role === 'FOOD_SEEKER' ? '#6b21a8' : '#15803d',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="FOOD_PROVIDER">FOOD_PROVIDER</option>
                          <option value="FOOD_SEEKER">FOOD_SEEKER</option>
                          <option value="VOLUNTEER">VOLUNTEER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{u.organizationName || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{u.city || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: u.isActive !== false ? '#dcfce7' : '#fee2e2',
                          color: u.isActive !== false ? '#15803d' : '#991b1b'
                        }}>
                          {u.isActive !== false ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className="hover-pop"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: u.isActive !== false ? '1px solid #fca5a5' : '1px solid #86efac',
                            backgroundColor: u.isActive !== false ? '#fff1f2' : '#f0fdf4',
                            color: u.isActive !== false ? '#be123c' : '#15803d',
                            cursor: 'pointer'
                          }}
                        >
                          {u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dash-empty-state">
              <div className="dash-empty-state-icon">
                <Users size={28} color="#0f766e" />
              </div>
              <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No users found</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No users match the selected role or search filter.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 3. FOOD LISTINGS SUB-VIEW ─────────────────────────────────── */}
      {activeTab === 'listings' && (
        <div className="dash-section-card" style={{ padding: '1.5rem' }}>
          <SubViewHeader
            title="Food Listings Directory & Moderation"
            subtitle="Review all surplus posts across providers, filter by status, and moderate listing states"
            count={filteredListings.length}
            countLabel="listings"
          />

          {/* Search & Status Moderation Filter */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px', flexWrap: 'wrap' }}>
              {['ALL', 'AVAILABLE', 'CLAIMED', 'COMPLETED', 'CANCELLED'].map(s => (
                <button
                  key={s}
                  onClick={() => setListingStatusFilter(s)}
                  style={{
                    border: 'none',
                    background: listingStatusFilter === s ? '#ffffff' : 'transparent',
                    color: listingStatusFilter === s ? '#0f766e' : '#64748b',
                    fontWeight: listingStatusFilter === s ? 800 : 600,
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: listingStatusFilter === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', maxWidth: '280px', fontSize: '0.85rem' }}
                placeholder="Search listing title, provider, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <Skeleton height="240px" />
          ) : filteredListings.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Listing Title', 'Provider', 'Category', 'City', 'Price', 'Status Moderation', 'Deadline', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map(l => (
                    <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.title}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#0f766e', fontWeight: 700 }}>
                        {l.providerId?.name || l.providerId?.organizationName || 'Provider'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{l.category}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{l.pickupCity || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{l.priceType === 'FREE' ? '🟢 FREE' : `₹${l.price}`}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <select
                          value={l.status}
                          onChange={(e) => handleListingStatusChange(l, e.target.value)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="CLAIMED">CLAIMED</option>
                          <option value="PICKUP_ASSIGNED">PICKUP_ASSIGNED</option>
                          <option value="PICKED_UP">PICKED_UP</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {l.pickupDeadline ? new Date(l.pickupDeadline).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {l.status === 'AVAILABLE' ? (
                          <button
                            onClick={() => handleListingStatusChange(l, 'CANCELLED')}
                            className="hover-pop"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              border: '1px solid #fca5a5',
                              backgroundColor: '#fff1f2',
                              color: '#be123c',
                              cursor: 'pointer'
                            }}
                          >
                            Delist
                          </button>
                        ) : (
                          <button
                            onClick={() => handleListingStatusChange(l, 'AVAILABLE')}
                            className="hover-pop"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              border: '1px solid #86efac',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              cursor: 'pointer'
                            }}
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dash-empty-state">
              <div className="dash-empty-state-icon">
                <Package size={28} color="#0f766e" />
              </div>
              <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No listings found</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No listings match the selected filters or search query.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 4. DELIVERIES & LOGISTICS SUB-VIEW ──────────────────────────── */}
      {activeTab === 'deliveries' && (
        <div className="dash-section-card" style={{ padding: '1.5rem' }}>
          <SubViewHeader
            title="Logistics & Volunteer Deliveries"
            subtitle="Track live pickup runs, volunteer assignments, handoff stages, and delivery completion"
            count={filteredDeliveries.length}
            countLabel="deliveries"
          />

          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', maxWidth: '280px', fontSize: '0.85rem' }}
                placeholder="Search tracking code, volunteer, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <Skeleton height="240px" />
          ) : filteredDeliveries.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Tracking Code', 'Surplus Listing', 'Assigned Volunteer', 'Seeker NGO', 'Status', 'Pickup Address', 'Updated'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.map(d => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>
                        {d.trackingCode || d._id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.foodListingId?.title || 'Surplus Item'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#0f766e', fontWeight: 600 }}>
                        {d.volunteerId?.name || (
                          <span style={{ color: '#d97706', fontStyle: 'italic', fontSize: '0.78rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{d.seekerId?.name || 'Seeker'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}><Badge status={d.status} /></td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.pickupAddress || d.foodListingId?.pickupAddress || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dash-empty-state">
              <div className="dash-empty-state-icon">
                <Truck size={28} color="#0f766e" />
              </div>
              <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No deliveries logged</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Deliveries will appear once claims are approved by food providers.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 5. IMPACT & ANALYTICS SUB-VIEW ────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="dash-section-card" style={{ padding: '1.5rem' }}>
            <SubViewHeader
              title="Platform Impact & Environmental Analytics"
              subtitle="System-wide metrics: CO2 reduction, food rescued in kg, and meal redistribution statistics"
            />

            {/* Live Impact Analytics Charts from /api/analytics/impact */}
            <ImpactAnalyticsSection refreshTrigger={successfulRescues} />
          </div>

          {/* Additional Analytics: Category Distribution & AI Insights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Category Breakdown */}
            <div className="dash-section-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} color="#0f766e" /> Surplus Food Distribution by Category
              </div>
              {analyticsData?.categoryDistribution && analyticsData.categoryDistribution.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {analyticsData.categoryDistribution.map((item) => (
                    <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        <span>{item.category.replace('_', ' ')}</span>
                        <span>{item.count} listings</span>
                      </div>
                      <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.round((item.count / totalListings) * 100))}%`,
                            background: 'linear-gradient(90deg, #0f766e, #10b981)',
                            borderRadius: '9999px'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No category distribution data available yet.</p>
              )}
            </div>

            {/* AI Insights & Top Donors */}
            <div className="dash-section-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#7c3aed" /> Platform AI Intelligence & Donor Rankings
              </div>
              {insights && (
                <div style={{ marginBottom: '1.25rem', background: '#f5f3ff', padding: '1rem', borderRadius: '10px', border: '1px solid #ddd6fe', fontSize: '0.85rem', color: '#5b21b6', lineHeight: 1.5 }}>
                  💡 <strong>AI Insight:</strong> {insights.aiRecommendationText}
                </div>
              )}
              {analyticsData?.topContributors && analyticsData.topContributors.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Top Contributing Food Providers
                  </div>
                  {analyticsData.topContributors.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900 }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{c.organizationName || c.name || 'Provider'}</span>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f766e' }}>{c.count} posts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Top contributors will appear as donations are posted.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
