import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Heart, LogOut, Menu, X, BarChart2 } from 'lucide-react';
import { Badge } from './Badge';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'FOOD_PROVIDER': return '/provider';
      case 'FOOD_SEEKER': return '/seeker';
      case 'VOLUNTEER': return '/volunteer';
      case 'ADMIN': return '/admin';
      default: return '/';
    }
  };

  const dashboardLabelMap = {
    FOOD_PROVIDER: 'Provider Portal',
    FOOD_SEEKER: 'Seeker Hub',
    VOLUNTEER: 'Volunteer Desk',
    ADMIN: 'Admin Console'
  };

  return (
    <nav className={`glass-nav ${scrolled ? 'scrolled' : ''}`} style={{
      position: 'relative',
      zIndex: 100,
      transition: 'all 0.3s ease'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '74px' }}>
        {/* Brand Logo */}
        <Link to="/" className="hover-pop" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
          <motion.div
            whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.3 }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)'
            }}
          >
            <Heart size={22} fill="#ffffff" />
          </motion.div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
              MORSL
            </span>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
              Food Rescue Network
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="nav-desktop">
          <Link
            to="/"
            className="hover-pop"
            style={{
              fontSize: '0.925rem',
              fontWeight: 700,
              color: location.pathname === '/' ? '#0f766e' : '#475569',
              textDecoration: 'none',
              borderBottom: location.pathname === '/' ? '2px solid #0f766e' : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            Home
          </Link>
          
          <Link
            to="/impact"
            className="hover-pop"
            style={{
              fontSize: '0.925rem',
              fontWeight: 700,
              color: location.pathname === '/impact' ? '#0f766e' : '#475569',
              textDecoration: 'none',
              borderBottom: location.pathname === '/impact' ? '2px solid #0f766e' : '2px solid transparent',
              paddingBottom: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            Impact Analytics
          </Link>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <Link to={getDashboardPath()} className="btn btn-primary btn-sm hover-pop">
                <BarChart2 size={16} />
                {dashboardLabelMap[user.role] || 'Dashboard'}
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.75rem', borderLeft: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{user.name}</span>
                  <Badge status={user.role} />
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="btn btn-secondary btn-sm hover-pop"
                  style={{ padding: '0.4rem', color: '#64748b' }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm hover-pop">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm hover-pop">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ padding: '0.5rem', color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
          className="nav-mobile-toggle"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}
          >
            <div style={{ padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link to="/" onClick={() => setMobileOpen(false)} style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>
                Home
              </Link>
              <Link to="/impact" onClick={() => setMobileOpen(false)} style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>
                Impact Analytics
              </Link>

              {isAuthenticated ? (
                <>
                  <Link to={getDashboardPath()} onClick={() => setMobileOpen(false)} className="btn btn-primary" style={{ width: '100%' }}>
                    {dashboardLabelMap[user.role] || 'Dashboard'}
                  </Link>
                  <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
                    <LogOut size={16} /> Log Out
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                    Log In
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary" style={{ width: '100%' }}>
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
