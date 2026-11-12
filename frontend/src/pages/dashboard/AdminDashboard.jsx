import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminApi } from '../../api/adminApi';
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
  TrendingUp, BarChart2, Activity, Award, UserCheck, RefreshCw, MapPin
} from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'listings' | 'users' | 'deliveries' | 'claims' | 'analytics' | 'ai_assistant'
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // AI Analytics State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [insights, setInsights] = useState(null);

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
      } else if (tab && ['overview', 'listings', 'users', 'deliveries', 'claims', 'analytics', 'ai_assistant'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('dashboard-tab-change', handleTabChange);
    return () => window.removeEventListener('dashboard-tab-change', handleTabChange);
  }, []);

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
  const filteredListings = listings.filter(l =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.pickupAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.providerId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.organizationName && u.organizationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.city && u.city.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredDeliveries = deliveries.filter(d => {
    const q = searchQuery.toLowerCase();
    return (
      (d.trackingCode && d.trackingCode.toLowerCase().includes(q)) ||
      (d.foodListingId?.title && d.foodListingId.title.toLowerCase().includes(q)) ||
      (d.volunteerId?.name && d.volunteerId.name.toLowerCase().includes(q)) ||
      (d.status && d.status.toLowerCase().includes(q))
    );
  });

  const filteredClaims = claims.filter(c =>
    (c.foodListingId?.title && c.foodListingId.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.seekerId?.name && c.seekerId.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.status && c.status.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  };

  const kpiCards = [
    { label: 'Total Listings', value: totalListings, sub: `${activeListings} active now`, icon: <Package size={20} color="#0f766e" />, variant: 'teal', iconBg: 'rgba(204, 251, 241, 0.8)' },
    { label: 'Platform Users', value: users.length, sub: `${users.filter(u => u.role === 'FOOD_PROVIDER').length} Providers, ${users.filter(u => u.role === 'FOOD_SEEKER').length} Seekers`, icon: <Users size={20} color="#059669" />, variant: 'green', iconBg: 'rgba(209, 250, 229, 0.8)' },
    { label: 'Total Claims', value: totalClaims, sub: `${activeClaims} active`, icon: <FileText size={20} color="#d97706" />, variant: 'amber', iconBg: 'rgba(254, 243, 199, 0.8)' },
    { label: 'Active Deliveries', value: deliveries.filter(d => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)).length, sub: `${deliveries.length} total tasks`, icon: <Truck size={20} color="#7c3aed" />, variant: 'purple', iconBg: 'rgba(237, 233, 254, 0.8)' },
    { label: 'Food Rescued', value: Math.round(totalFoodRescuedKg), sub: 'Estimated kg', icon: <TrendingUp size={20} color="#1d4ed8" />, variant: 'blue', iconBg: 'rgba(219, 234, 254, 0.8)' },
    { label: 'Verified Rescues', value: successfulRescues, sub: 'Completed transfers', icon: <Award size={20} color="#be123c" />, variant: 'rose', iconBg: 'rgba(254, 205, 211, 0.8)' }
  ];

  return (
    <DashboardLayout
      title="Admin & Platform Governance"
      subtitle="Comprehensive platform overview, food listings oversight, claims management, and compliance auditing"
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
            className={`dash-kpi-card dash-kpi-card--${kpi.variant}`}
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

      {/* ── TABS BAR ─────────────────────────────────────────────────── */}
      <div className="dash-tabs-bar" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'overview', label: 'Overview', icon: <Shield size={15} /> },
          { id: 'listings', label: 'All Listings', icon: <Package size={15} />, count: listings.length },
          { id: 'users', label: 'Users & Roles', icon: <Users size={15} />, count: users.length },
          { id: 'deliveries', label: 'Deliveries & Logistics', icon: <Truck size={15} />, count: deliveries.length },
          { id: 'claims', label: 'Claims Audit', icon: <FileText size={15} />, count: claims.length },
          { id: 'analytics', label: 'Analytics & Impact', icon: <BarChart2 size={15} />, color: '#0f766e' },
          { id: 'ai_assistant', label: 'AI Insights', icon: <Sparkles size={15} />, color: '#7c3aed' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`dash-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id && tab.color ? { color: tab.color } : {}}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="dash-tab-btn-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── 1. OVERVIEW TAB ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* PLATFORM-WIDE IMPACT & SUSTAINABILITY ANALYTICS */}
          <ImpactAnalyticsSection refreshTrigger={successfulRescues} />

          {/* Platform Stats Summary Grid */}
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
                  { label: 'Active Volunteers', value: users.filter(u => u.role === 'VOLUNTEER').length, color: '#0f766e' }
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

      {/* ── 2. ALL LISTINGS TAB ───────────────────────────────────────── */}
      {activeTab === 'listings' && (
        <div className="dash-section-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span className="dash-section-title">Food Listings Audit Directory</span>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', maxWidth: '280px', fontSize: '0.85rem' }}
                placeholder="Search listings or providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <Skeleton height="200px" />
          ) : filteredListings.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Listing Title', 'Provider', 'Category', 'City', 'Price', 'Status', 'Deadline'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map(l => (
                    <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.title}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#0f766e', fontWeight: 700 }}>{l.providerId?.name || l.providerId?.organizationName || 'Provider'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{l.category}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{l.pickupCity || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{l.priceType === 'FREE' ? '🟢 FREE' : `₹${l.price}`}</td>
                      <td style={{ padding: '0.85rem 1rem' }}><Badge status={l.status} /></td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{l.pickupDeadline ? new Date(l.pickupDeadline).toLocaleDateString() : '—'}</td>
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
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No listings matching your search query.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 3. USERS & ROLES TAB ───────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="dash-section-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <span className="dash-section-title">Platform Users & Roles Directory</span>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                All registered Providers, Seekers, Volunteers, and Administrators
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Role filter pills */}
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
                    {r === 'ALL' ? 'All' : r.replace('FOOD_', '')}
                  </button>
                ))}
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem', maxWidth: '240px', fontSize: '0.85rem' }}
                  placeholder="Search user name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <Skeleton height="200px" />
          ) : filteredUsers.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Name', 'Email', 'Role', 'Organization', 'City', 'Joined Date'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>{u.name}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{u.email}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor:
                            u.role === 'ADMIN' ? '#fee2e2' :
                            u.role === 'FOOD_PROVIDER' ? '#ccfbf1' :
                            u.role === 'FOOD_SEEKER' ? '#ede9fe' : '#dcfce7',
                          color:
                            u.role === 'ADMIN' ? '#991b1b' :
                            u.role === 'FOOD_PROVIDER' ? '#0f766e' :
                            u.role === 'FOOD_SEEKER' ? '#6b21a8' : '#15803d'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{u.organizationName || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{u.city || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
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

      {/* ── 4. DELIVERIES & LOGISTICS TAB ──────────────────────────────── */}
      {activeTab === 'deliveries' && (
        <div className="dash-section-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <span className="dash-section-title">Deliveries & Logistics Oversight</span>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                Track volunteer pickup tasks, status progression, and delivery handoffs
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', maxWidth: '280px', fontSize: '0.85rem' }}
                placeholder="Search tracking code or listing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <Skeleton height="200px" />
          ) : filteredDeliveries.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Tracking Code', 'Listing', 'Assigned Volunteer', 'Seeker NGO', 'Status', 'Address'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.map(d => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>
                        {d.trackingCode || d._id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.foodListingId?.title || 'Food Listing'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#0f766e', fontWeight: 600 }}>
                        {d.volunteerId?.name || (
                          <span style={{ color: '#d97706', fontStyle: 'italic', fontSize: '0.78rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{d.seekerId?.name || 'Seeker'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}><Badge status={d.status} /></td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.pickupAddress || d.foodListingId?.pickupAddress || '—'}
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
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Deliveries appear here once claims are approved by providers.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 5. CLAIMS AUDIT TAB ───────────────────────────────────────── */}
      {activeTab === 'claims' && (
        <div className="dash-section-card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span className="dash-section-title">Claims Oversight Directory</span>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', maxWidth: '260px', fontSize: '0.85rem' }}
                placeholder="Search claims or NGOs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <Skeleton height="200px" />
          ) : filteredClaims.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Listing', 'Seeker / NGO', 'Provider', 'Status', 'Claim Date'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map(c => (
                    <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.foodListingId?.title || 'Listing'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#0f766e', fontWeight: 700 }}>{c.seekerId?.name || 'NGO'}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{c.providerId?.name || c.providerId?.organizationName || 'Provider'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}><Badge status={c.status} /></td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dash-empty-state">
              <div className="dash-empty-state-icon">
                <FileText size={28} color="#0f766e" />
              </div>
              <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No claims found</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No claims logged yet or none match your search.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 6. ANALYTICS & IMPACT TAB ─────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ImpactAnalyticsSection refreshTrigger={successfulRescues} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Surplus Category Distribution */}
            <div className="dash-section-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} color="#0f766e" /> Surplus Food Distribution by Category
              </div>
              {analyticsData?.categoryDistribution && analyticsData.categoryDistribution.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {analyticsData.categoryDistribution.map((item) => (
                    <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
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

            {/* Top Donors / Contributors */}
            <div className="dash-section-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} color="#d97706" /> Top Contributing Food Providers
              </div>
              {analyticsData?.topContributors && analyticsData.topContributors.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Top contributors will be listed as donations are posted.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. AI ASSISTANT TAB ───────────────────────────────────────── */}
      {activeTab === 'ai_assistant' && (
        <div className="dash-admin-row">
          {/* LEFT: Query + Response */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="dash-section-card" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderColor: 'rgba(187, 247, 208, 0.7)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} /> Admin AI Analytics Query Assistant
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#15803d', marginBottom: '1.25rem' }}>
                Ask natural-language questions about platform surplus activity, top category contributions, or user roles.
              </p>
              <form onSubmit={handleAiQuerySubmit} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, backgroundColor: '#ffffff', fontSize: '0.9rem' }}
                  placeholder="e.g. Which food category is rescued most?"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary hover-pop btn-shimmer"
                  style={{ background: '#15803d', borderColor: '#15803d', whiteSpace: 'nowrap' }}
                  disabled={aiLoading}
                >
                  <Send size={16} /> {aiLoading ? 'Querying...' : 'Ask AI'}
                </button>
              </form>

              {aiResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: '1.25rem', background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #86efac', boxShadow: '0 2px 8px rgba(15, 118, 110, 0.08)' }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    AI Response
                  </div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.6 }}>{aiResponse.answer}</p>
                </motion.div>
              )}

              {/* Quick Query Suggestions */}
              <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  'Most rescued food category?',
                  'Active listings by city?',
                  'Rescue success rate?',
                  'Top contributing providers?'
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setAiQuery(suggestion)}
                    className="hover-pop"
                    style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #bbf7d0', color: '#166534', cursor: 'pointer' }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Insights Panel */}
          <div>
            {insights ? (
              <div className="dash-section-card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📈 Real-Time Platform Insights
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Top Surplus Category
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f766e' }}>
                      {insights.topCategory}
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '10px', border: '1px solid #d1fae5' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Platform Rescue Rate
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>
                      {insights.summary?.rescueRatePercent}%
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.875rem', color: '#475569', background: '#fdfbf7', padding: '0.85rem 1rem', borderRadius: '10px', borderLeft: '3px solid #0f766e', lineHeight: 1.6 }}>
                  💡 <strong>AI Recommendation:</strong> {insights.aiRecommendationText}
                </div>
              </div>
            ) : (
              <div className="dash-section-card" style={{ padding: '1.75rem' }}>
                <div className="dash-empty-state" style={{ padding: '2.5rem 1.5rem' }}>
                  <div className="dash-empty-state-icon">
                    <BarChart2 size={28} color="#0f766e" />
                  </div>
                  <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>No insights loaded</p>
                  <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Platform insights will appear here as more rescue data accumulates.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
