import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Toast } from '../../components/common/Toast';
import { Heart, User, Mail, Lock, Phone, Building, Truck, Users, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const ROLES = [
  {
    id: 'FOOD_PROVIDER',
    title: 'Food Provider',
    desc: 'Restaurants, Hotels, Bakeries, Caterers listing surplus food',
    icon: Building
  },
  {
    id: 'FOOD_SEEKER',
    title: 'Food Seeker (NGO / Shelter)',
    desc: 'NGOs, Charities, Shelters claiming food to serve people in need',
    icon: Users
  },
  {
    id: 'VOLUNTEER',
    title: 'Logistics Volunteer',
    desc: 'Individual or team picking up & delivering food between provider & seeker',
    icon: Truck
  }
];

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'FOOD_PROVIDER'
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (roleId) => {
    setFormData({ ...formData, role: roleId });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast({ message: '', type: 'error' });

    try {
      const user = await register(formData);
      switch (user.role) {
        case 'FOOD_PROVIDER': navigate('/provider'); break;
        case 'FOOD_SEEKER': navigate('/seeker'); break;
        case 'VOLUNTEER': navigate('/volunteer'); break;
        case 'ADMIN': navigate('/admin'); break;
        default: navigate('/'); break;
      }
    } catch (err) {
      setToast({ message: err.message || 'Registration failed. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 1.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: '1020px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            borderRadius: '24px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.12)',
            border: '1px solid #e2e8f0'
          }}
        >
          {/* Left Visual Column */}
          <div style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            color: '#ffffff',
            padding: '3.5rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2rem' }}>
                <Sparkles size={14} /> Join the Zero-Waste Movement
              </div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, color: '#ffffff', marginBottom: '1.25rem' }}>
                Connect your organization to end food waste.
              </h2>
              <p style={{ fontSize: '0.95rem', opacity: 0.88, lineHeight: 1.6 }}>
                Whether you have surplus food, need food for your community, or can help with logistics transport, your participation makes a direct impact.
              </p>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1.5rem', marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', opacity: 0.9 }}>
              <ShieldCheck size={18} color="#ccfbf1" /> Free & Secure Registration for Organizations & Individuals
            </div>
          </div>

          {/* Right Form Column */}
          <div style={{ padding: '3rem 2.5rem' }}>
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Create Account</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.35rem' }}>
                Select your role and complete account setup
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Role Selection Cards */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.6rem', display: 'block' }}>Select Your Platform Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const selected = formData.role === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleRoleSelect(r.id)}
                        className="hover-pop"
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '12px',
                          border: `2px solid ${selected ? '#0f766e' : '#e2e8f0'}`,
                          backgroundColor: selected ? '#f0fdfa' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: selected ? '#0f766e' : '#f1f5f9', color: selected ? '#ffffff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: selected ? '#0f766e' : '#0f172a' }}>{r.title}</div>
                          <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.1rem' }}>{r.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Name / Org Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name / Organization Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="name"
                    type="text"
                    name="name"
                    required
                    placeholder="Green Leaf Restaurant / Hope Foundation"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">Work Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    placeholder="contact@organization.org"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    placeholder="+91 98765 43210"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label" htmlFor="password">Password (min 6 chars, 1 digit)</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary hover-pop btn-shimmer"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
              >
                {loading ? 'Creating account...' : 'Complete Registration'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div style={{ marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
              Already registered?{' '}
              <Link to="/login" style={{ fontWeight: 700, color: '#0f766e', textDecoration: 'none' }} className="hover-pop">
                Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default RegisterPage;
