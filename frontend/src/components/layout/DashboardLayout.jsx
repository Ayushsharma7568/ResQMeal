import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FoodDoodlesSVG } from '../common/FoodDoodlesSVG';
import { 
  Heart, LayoutDashboard, PlusCircle, Package, Clock, Truck, 
  Users, BarChart2, LogOut, UserCheck, CheckCircle2, Shield, Home, Menu, X,
  Search, MapPin, Radar, ClipboardList, Settings, User, Bell, 
  UtensilsCrossed, Map, ListChecks, FileText, Sparkles, TrendingUp
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { NotificationBell } from '../common/NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const FOOD_PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=60',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=60',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=60',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=60',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&q=60',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=60',
];

export const getFoodImage = (index = 0, photoUrl) => {
  if (photoUrl && photoUrl.startsWith('http')) return photoUrl;
  return FOOD_PLACEHOLDER_IMAGES[index % FOOD_PLACEHOLDER_IMAGES.length];
};

export const DashboardLayout = ({ title, subtitle, children, actions }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');

  // Close mobile sidebar on route change, reset active hash if base route changed
  useEffect(() => {
    setIsMobileOpen(false);
    // Reset activeHash when navigating away from current dashboard
    setActiveHash(prev => {
      // Find if any nav item matches current pathname with a hash
      const navItems = getNavLinks();
      const hasMatchingHash = navItems.some(item => item.path === location.pathname && item.hash === prev);
      return hasMatchingHash ? prev : '';
    });
  }, [location.pathname]);

  // Synchronize activeHash whenever a tab change event is dispatched
  useEffect(() => {
    const handleTabChange = (e) => {
      const tab = e.detail?.tab;
      if (tab) {
        setActiveHash(tab);
      }
    };
    window.addEventListener('dashboard-tab-change', handleTabChange);
    return () => window.removeEventListener('dashboard-tab-change', handleTabChange);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getNavLinks = () => {
    const common = [
      { path: '/impact', label: 'Impact Analytics', icon: TrendingUp },
      { path: '/', label: 'Website Home', icon: Home },
    ];

    switch (user?.role) {
      case 'FOOD_PROVIDER':
        return [
          { path: '/provider', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/provider', label: 'Food Listings', icon: UtensilsCrossed, hash: 'listings' },
          { path: '/provider', label: 'Incoming Claims', icon: ClipboardList, hash: 'claims' },
          ...common,
        ];
      case 'FOOD_SEEKER':
        return [
          { path: '/seeker', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/seeker', label: 'Browse Food', icon: Search, hash: 'browse' },
          { path: '/seeker', label: 'Rescue Radar', icon: Radar, hash: 'radar' },
          { path: '/seeker', label: 'My Claims', icon: ClipboardList, hash: 'claims' },
          ...common,
        ];
      case 'VOLUNTEER':
        return [
          { path: '/volunteer', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/volunteer', label: 'Available Pickups', icon: Package, hash: 'available' },
          { path: '/volunteer', label: 'My Deliveries', icon: Truck, hash: 'my_tasks' },
          ...common,
        ];
      case 'ADMIN':
        return [
          { path: '/admin', label: 'Overview', icon: Shield, hash: 'overview' },
          { path: '/admin', label: 'User Management', icon: Users, hash: 'users' },
          { path: '/admin', label: 'Food Listings', icon: ListChecks, hash: 'listings' },
          { path: '/admin', label: 'Deliveries & Logistics', icon: Truck, hash: 'deliveries' },
          { path: '/admin', label: 'Impact Analytics', icon: BarChart2, hash: 'analytics' },
          ...common,
        ];
      default:
        return common;
    }
  };

  const navItems = getNavLinks();

  // Dashboard-specific doodle positions (inside main content area)
  const dashDoodles = useMemo(() => [
    { type: 'apple', top: '12%', right: '3%', size: 30, anim: 'doodle-float-1', delay: '0s' },
    { type: 'leaf', top: '35%', right: '5%', size: 28, anim: 'doodle-float-2', delay: '3s' },
    { type: 'bowl', top: '55%', right: '2%', size: 32, anim: 'doodle-float-3', delay: '6s' },
    { type: 'heart', top: '75%', right: '6%', size: 26, anim: 'doodle-float-1', delay: '2s' },
    { type: 'bread', top: '22%', left: '92%', size: 28, anim: 'doodle-float-2', delay: '5s' },
    { type: 'sprout', top: '88%', right: '4%', size: 30, anim: 'doodle-float-3', delay: '1s' },
  ], []);

  const renderSidebarContent = () => (
    <>
      {/* Brand Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(209, 250, 229, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" className="sidebar-brand-link" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '11px',
            background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)'
          }}>
            <Heart size={20} fill="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Don't Waste It
            </span>
            <span style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
              Food Rescue Network
            </span>
          </div>
        </Link>
        {/* Close button for mobile drawer */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="dashboard-mobile-close-btn"
          aria-label="Close menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <div style={{ padding: '1.25rem 0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 0.75rem 0.6rem' }}>
          Navigation
        </div>
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isOnDashboardRoute = location.pathname === item.path;
          const isActive = item.hash
            ? isOnDashboardRoute && (activeHash === item.hash || (item.hash === 'overview' && (!activeHash || activeHash === 'overview')))
            : isOnDashboardRoute && (!activeHash || activeHash === 'overview') && idx === 0;

          const handleClick = (e) => {
            if (item.hash) {
              e.preventDefault();
              if (!isOnDashboardRoute) {
                navigate(item.path);
              }
              setActiveHash(item.hash);
              window.dispatchEvent(new CustomEvent('dashboard-tab-change', { detail: { tab: item.hash } }));
              setIsMobileOpen(false);
            } else {
              // Clicking an item WITHOUT a hash (e.g. "Dashboard" link)
              if (isOnDashboardRoute) {
                e.preventDefault();
                setActiveHash('');
                window.dispatchEvent(new CustomEvent('dashboard-tab-change', { detail: { tab: 'overview' } }));
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setIsMobileOpen(false);
              } else {
                setActiveHash('');
              }
            }
          };

          return (
            <Link
              key={`${item.path}-${item.label}`}
              to={item.path}
              onClick={handleClick}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: isActive ? 700 : 600,
                color: isActive ? '#0f766e' : '#475569',
                backgroundColor: isActive ? 'rgba(204, 251, 241, 0.55)' : 'transparent',
                textDecoration: 'none',
                position: 'relative',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarIndicator"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '4px',
                    backgroundColor: '#0f766e',
                    borderRadius: '0 4px 4px 0'
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={18} color={isActive ? '#0f766e' : '#64748b'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User Account & Logout */}
      <div style={{ padding: '1rem 0.85rem', borderTop: '1px solid rgba(209, 250, 229, 0.5)', background: 'rgba(240, 253, 250, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #ccfbf1 0%, #d1fae5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(167, 243, 208, 0.5)',
            flexShrink: 0
          }}>
            <User size={18} color="#0f766e" />
          </div>
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ marginTop: '0.15rem' }}>
              <Badge status={user?.role} />
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="hover-pop"
            style={{
              padding: '0.45rem',
              borderRadius: '10px',
              color: '#dc2626',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Dashboard pastel background layer */}
      <div className="dashboard-bg-layer" aria-hidden="true" />
      <div className="dashboard-doodle-layer" aria-hidden="true">
        {dashDoodles.map((d, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: d.top,
              left: d.left,
              right: d.right,
              animationDelay: d.delay,
              opacity: 0.1
            }}
            className={d.anim}
          >
            <FoodDoodlesSVG type={d.type} size={d.size} color="#0f766e" />
          </div>
        ))}
      </div>

      {/* Desktop Left Sidebar */}
      <aside className="dashboard-desktop-sidebar">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="dashboard-mobile-backdrop"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="dashboard-mobile-drawer"
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Workspace Area */}
      <div className="dashboard-main-area">
        {/* Sticky Top Header */}
        <header className="dashboard-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
            <button
              onClick={() => setIsMobileOpen(true)}
              className="dashboard-hamburger-btn"
              aria-label="Open sidebar menu"
            >
              <Menu size={22} color="#0f172a" />
            </button>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ minWidth: 0 }}
            >
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
              </h1>
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '1px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {subtitle}
              </motion.p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}
          >
            {actions && <div style={{ display: 'flex', gap: '0.75rem' }}>{actions}</div>}
            <Badge status={user?.role} />
            <NotificationBell />
          </motion.div>
        </header>

        {/* Workspace Body */}
        <main className="dashboard-body-main">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
