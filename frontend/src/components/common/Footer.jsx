import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, Globe, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export const Footer = () => {
  return (
    <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '4rem 0 2rem', marginTop: 'auto' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '3rem', paddingBottom: '3rem', borderBottom: '1px solid #1e293b' }}>
          {/* Brand Info */}
          <div>
            <Link to="/" className="hover-pop" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', textDecoration: 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.4)' }}>
                <Heart size={20} fill="#ffffff" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>MORSL</span>
            </Link>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#94a3b8' }}>
              Connecting surplus food providers with verified local organizations and community volunteers to prevent food waste and nourish people.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', padding: 0 }}>
              <li><Link to="/" className="hover-pop" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'inline-block', transition: 'color 0.15s ease' }}>Home</Link></li>
              <li><Link to="/impact" className="hover-pop" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'inline-block', transition: 'color 0.15s ease' }}>Impact Analytics</Link></li>
              <li><Link to="/register" className="hover-pop" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'inline-block', transition: 'color 0.15s ease' }}>Register Organization</Link></li>
              <li><Link to="/login" className="hover-pop" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'inline-block', transition: 'color 0.15s ease' }}>Login to Portal</Link></li>
            </ul>
          </div>

          {/* Roles */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Who Can Join</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', padding: 0 }}>
              <li><span style={{ color: '#cbd5e1' }}>Food Providers (Restaurants/Hotels)</span></li>
              <li><span style={{ color: '#cbd5e1' }}>Food Seekers (NGOs/Shelters)</span></li>
              <li><span style={{ color: '#cbd5e1' }}>Logistics Volunteers</span></li>
              <li><span style={{ color: '#cbd5e1' }}>Corporate Food Donors</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact & Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} color="#0f766e" /> <span>support@morsl.org</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={16} color="#0f766e" /> <span>India Food Rescue Network</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#14b8a6' }}>
                <ShieldCheck size={16} /> <span>Verified Non-Profit Protocol</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div style={{ paddingTop: '2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', fontSize: '0.85rem' }}>
          <p>© {new Date().getFullYear()} MORSL Platform. All rights reserved.</p>
          <p style={{ color: '#64748b' }}>Building a zero-waste food ecosystem.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
