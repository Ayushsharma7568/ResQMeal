import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Toast } from '../../components/common/Toast';
import { Heart, LogIn, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast({ message: '', type: 'error' });

    try {
      const user = await login(formData.email, formData.password);
      switch (user.role) {
        case 'FOOD_PROVIDER': navigate('/provider'); break;
        case 'FOOD_SEEKER': navigate('/seeker'); break;
        case 'VOLUNTEER': navigate('/volunteer'); break;
        case 'ADMIN': navigate('/admin'); break;
        default: navigate('/'); break;
      }
    } catch (err) {
      setToast({ message: err.message || 'Login failed. Please check your credentials.', type: 'error' });
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
            maxWidth: '920px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
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
            padding: '3rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2rem' }}>
                <Sparkles size={14} /> Zero-Waste Portal Access
              </div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, color: '#ffffff', marginBottom: '1rem' }}>
                Nourishing communities together.
              </h2>
              <p style={{ fontSize: '0.95rem', opacity: 0.88, lineHeight: 1.6 }}>
                Log in to manage surplus food listings, submit NGO claims, or coordinate logistics delivery tasks.
              </p>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1.5rem', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', opacity: 0.9 }}>
              <ShieldCheck size={18} color="#ccfbf1" /> Verified Non-Profit Redistribution Network
            </div>
          </div>

          {/* Right Form Column */}
          <div style={{ padding: '3rem 2.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Sign In</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.35rem' }}>
                Enter your account credentials to continue
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    placeholder="name@organization.org"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label" htmlFor="password">Password</label>
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
                {loading ? 'Logging in...' : 'Sign In'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ fontWeight: 700, color: '#0f766e', textDecoration: 'none' }} className="hover-pop">
                Register Organization
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default LoginPage;
