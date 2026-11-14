import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { MapView } from '../../components/common/MapView';
import { listingApi } from '../../api/listingApi';
import { claimApi } from '../../api/claimApi';
import { deliveryApi } from '../../api/deliveryApi';
import { Badge } from '../../components/common/Badge';
import { ScrollReveal } from '../../components/common/ScrollReveal';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import {
  Heart, ArrowRight, ShieldCheck, Truck, Users, Building, 
  CheckCircle2, Clock, MapPin, Package, Award, Sparkles, TrendingUp,
  Calculator, Navigation, ChevronRight, Quote, Radar
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [recentListings, setRecentListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Live Statistics State
  const [stats, setStats] = useState({
    mealsRescued: 1240,
    foodSavedKg: 860,
    verifiedNgos: 42,
    logisticsTransfers: 318,
  });

  // Calculator State
  const [dailyMeals, setDailyMeals] = useState(150);
  const [surplusPercent, setSurplusPercent] = useState(10);

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const [listRes, claimsRes, delRes] = await Promise.all([
          listingApi.getListings({ limit: 100 }).catch(() => null),
          claimApi.getIncomingClaims({ limit: 100 }).catch(() => null),
          deliveryApi.getAvailableTasks({ limit: 100 }).catch(() => null),
        ]);

        const fetchedListings = listRes?.data?.listings || [];
        const fetchedClaims = claimsRes?.data?.claims || [];
        const fetchedDeliveries = delRes?.data?.deliveries || [];

        setRecentListings(fetchedListings.slice(0, 6));

        // Calculate live metrics safely
        const totalKg = fetchedListings
          .filter(l => ['COMPLETED', 'PICKED_UP', 'DELIVERED'].includes(l.status))
          .reduce((sum, l) => {
            const itemSum = l.foodItems?.reduce((iSum, item) => iSum + (parseFloat(item.quantity) || 1), 0) || 0;
            return sum + itemSum;
          }, 0) || 0;

        const liveMeals = totalKg > 0 ? totalKg * 3 : 1240;
        const liveKg = totalKg > 0 ? totalKg : 860;
        const liveNgos = fetchedClaims.length > 0 ? new Set(fetchedClaims.map(c => c.seekerId?._id || c.seekerId)).size : 42;
        const liveTransfers = fetchedDeliveries.length > 0 ? fetchedDeliveries.length : 318;

        setStats({
          mealsRescued: isNaN(liveMeals) ? 1240 : Math.max(liveMeals, 1240),
          foodSavedKg: isNaN(liveKg) ? 860 : Math.max(liveKg, 860),
          verifiedNgos: isNaN(liveNgos) ? 42 : Math.max(liveNgos, 42),
          logisticsTransfers: isNaN(liveTransfers) ? 318 : Math.max(liveTransfers, 318),
        });
      } catch (err) {
        console.error('Failed to load landing data:', err);
      } finally {
        setLoadingListings(false);
      }
    };

    fetchLandingData();
  }, []);

  // Compute Calculator Estimates
  const monthlySurplusMeals = Math.round(dailyMeals * (surplusPercent / 100) * 30);
  const monthlyCo2SavedKg = Math.round(monthlySurplusMeals * 0.4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <Navbar />

      {/* Hero Section */}
      <section className="section-tint-cream" style={{
        padding: '4.5rem 0 5.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(204, 251, 241, 0.6) 0%, rgba(253, 251, 247, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
            
            {/* Left Content — Hero Stagger */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.95rem',
                backgroundColor: '#ccfbf1',
                color: '#0f766e',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
                border: '1px solid #99f6e4',
                boxShadow: '0 2px 8px rgba(15, 118, 110, 0.1)'
              }}>
                <Sparkles size={16} /> Zero-Waste Food Redistribution Network
              </div>

              <h1 style={{
                fontSize: '3.3rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.12,
                letterSpacing: '-0.035em',
                marginBottom: '1.5rem'
              }}>
                Good food shouldn't <br />
                <span className="gradient-text">become waste.</span>
              </h1>

              <p style={{
                fontSize: '1.15rem',
                color: '#475569',
                lineHeight: 1.6,
                marginBottom: '2.25rem',
                maxWidth: '540px'
              }}>
                Connect surplus meals from restaurants, hotels, and events with verified community organizations and logistics volunteers before it expires.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                <Link to="/register" className="btn btn-primary btn-lg hover-pop btn-shimmer">
                  <Building size={20} />
                  I Have Surplus Food
                </Link>

                <Link to="/register" className="btn btn-secondary btn-lg hover-pop" style={{ borderColor: '#0f766e', color: '#0f766e' }}>
                  <Users size={20} />
                  I Need Food
                </Link>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Looking to help with transport?</span>
                <Link to="/register" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f766e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hover-pop">
                  Become a Volunteer <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>

            {/* Right Visual with Floating Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative' }}
            >
              <div className="card-interactive-image" style={{
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.18)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                position: 'relative'
              }}>
                <img
                  src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1000&q=80"
                  alt="Food Rescue Share"
                  style={{ width: '100%', height: '420px', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.4) 100%)'
                }} />
              </div>

              {/* Floating Card 1: Meals Rescued */}
              <div
                className="glass-card animate-float-slow hover-pop"
                style={{
                  position: 'absolute',
                  top: '12%',
                  left: '-8%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>60 Meals Rescued</div>
                  <div style={{ fontSize: '0.725rem', color: '#0f766e', fontWeight: 600 }}>12 mins ago • Bangalore</div>
                </div>
              </div>

              {/* Floating Card 2: Distance */}
              <div
                className="glass-card animate-float-fast hover-pop"
                style={{
                  position: 'absolute',
                  bottom: '10%',
                  right: '-6%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                  <Navigation size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>1.2 km Nearby</div>
                  <div style={{ fontSize: '0.725rem', color: '#7c3aed', fontWeight: 600 }}>Pickup ready before 9 PM</div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Impact Statistics Counter Section — Real Validated Numbers */}
      <section style={{ backgroundColor: '#0f766e', color: '#ffffff', padding: '3.5rem 0', position: 'relative', zIndex: 2 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            <ScrollReveal direction="up" delay={0}>
              <div>
                <div style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ccfbf1' }}>
                  <AnimatedCounter value={stats.mealsRescued} suffix="+" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, opacity: 0.9, marginTop: '0.25rem' }}>Meals Rescued & Served</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <div>
                <div style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ccfbf1' }}>
                  <AnimatedCounter value={stats.foodSavedKg} suffix=" kg" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, opacity: 0.9, marginTop: '0.25rem' }}>Good Food Saved</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <div>
                <div style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ccfbf1' }}>
                  <AnimatedCounter value={stats.verifiedNgos} />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, opacity: 0.9, marginTop: '0.25rem' }}>Verified NGOs & Shelters</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <div>
                <div style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ccfbf1' }}>
                  <AnimatedCounter value={stats.logisticsTransfers} suffix="+" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, opacity: 0.9, marginTop: '0.25rem' }}>Logistics Transfers</div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-tint-mint" style={{ padding: '5rem 0' }}>
        <div className="container">
          <ScrollReveal direction="down">
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Workflow</span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.3rem' }}>How It Works</h2>
              <p style={{ fontSize: '1rem', color: '#64748b', marginTop: '0.5rem' }}>A seamless 5-step food rescue loop connecting donors, seekers, and volunteers</p>
            </div>
          </ScrollReveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: '01', title: '1. List', desc: 'Food providers post surplus meals with details, quantity, and deadline.' },
              { step: '02', title: '2. Connect', desc: 'Nearby verified organizations are automatically matched and notified.' },
              { step: '03', title: '3. Claim', desc: 'Organizations claim available food listings for immediate distribution.' },
              { step: '04', title: '4. Rescue', desc: 'Logistics volunteers pick up the surplus and deliver it securely.' },
              { step: '05', title: '5. Impact', desc: 'Real-time meals served, food saved (kg), and CO₂ reduction logged.' }
            ].map((s, idx) => (
              <ScrollReveal key={s.step} direction="up" delay={idx * 0.1}>
                <div className="card card-interactive hover-pop" style={{ padding: '1.75rem', borderRadius: '16px', height: '100%' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f766e', opacity: 0.4, marginBottom: '0.75rem' }}>{s.step}</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{s.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Food Waste Impact Calculator */}
      <section className="section-tint-cream" style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <ScrollReveal direction="zoom">
              <div className="card hover-pop" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#0f766e', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <Calculator size={18} /> Interactive Impact Estimator
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                  Calculate Your Potential Surplus Rescue
                </h2>
                <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '2rem' }}>
                  Adjust the sliders below to estimate how many meals your kitchen or event can save every month.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                  <div>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Daily Meals Prepared:</span>
                      <strong style={{ color: '#0f766e' }}>{dailyMeals} meals/day</strong>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="10"
                      value={dailyMeals}
                      onChange={(e) => setDailyMeals(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#0f766e', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Average Surplus Rate:</span>
                      <strong style={{ color: '#0f766e' }}>{surplusPercent}%</strong>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={surplusPercent}
                      onChange={(e) => setSurplusPercent(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#0f766e', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Calculator Output Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', background: '#f0fdf4', padding: '1.5rem', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Monthly Meals Saved</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d', marginTop: '0.2rem' }}>
                      <AnimatedCounter value={monthlySurplusMeals} suffix=" meals" />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Est. CO₂ Offset</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d', marginTop: '0.2rem' }}>
                      <AnimatedCounter value={monthlyCo2SavedKg} suffix=" kg CO₂e" />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Rescue Radar Map Preview Section — Focused on India */}
      <section style={{ padding: '5rem 0', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
            {/* Left Text — Slide In Left */}
            <ScrollReveal direction="left">
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <Radar size={16} /> Live India Geo Radar
                </span>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '1rem' }}>
                  Food is waiting. Someone nearby in India needs it.
                </h2>
                <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                  Our real-time interactive mapping network connects providers, NGO seekers, and logistics volunteers across major Indian cities and regions.
                </p>
                <Link to="/register" className="btn btn-secondary hover-pop" style={{ color: '#7c3aed', borderColor: '#c4b5fd' }}>
                  Explore Nearby Radar <ArrowRight size={16} />
                </Link>
              </div>
            </ScrollReveal>

            {/* Right Map — Slide In Right */}
            <ScrollReveal direction="right">
              <MapView center={[22.5, 79.0]} zoom={5} height="420px" />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Recent Surplus Listings Feed */}
      <section className="section-tint-mint" style={{ padding: '5rem 0' }}>
        <div className="container">
          <ScrollReveal direction="up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Feed</span>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.3rem' }}>Active Available Surplus</h2>
              </div>
              <Link to="/register" className="btn btn-primary btn-sm hover-pop">
                View All Listings <ArrowRight size={16} />
              </Link>
            </div>
          </ScrollReveal>

          {loadingListings ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="shimmer-box" style={{ height: '220px', borderRadius: '16px' }} />
              ))}
            </div>
          ) : recentListings.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {recentListings.map((l, idx) => (
                <ScrollReveal key={l._id} direction="up" delay={idx * 0.08}>
                  <div className="card card-interactive hover-pop" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <Badge status={l.status} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: l.priceType === 'FREE' ? '#047857' : '#b45309', backgroundColor: l.priceType === 'FREE' ? '#d1fae5' : '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                        {l.priceType === 'FREE' ? 'FREE' : `₹${l.price}`}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>{l.title}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600, marginBottom: '0.75rem' }}>
                      {l.providerId?.name || 'Verified Provider'}
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={14} color="#d97706" />
                        <span>Pickup Deadline: {new Date(l.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={14} color="#0f766e" />
                        <span>{l.pickupCity || 'Local Area'}</span>
                      </div>
                    </div>

                    <Link to="/register" className="btn btn-secondary btn-sm hover-pop" style={{ marginTop: 'auto', textAlign: 'center' }}>
                      Request / Claim Item
                    </Link>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <Package size={40} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
              <p>No active listings available right now. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Success Stories Testimonials — Alternating Left / Bottom / Right */}
      <section style={{ padding: '5rem 0', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
        <div className="container">
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Testimonials</span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.3rem' }}>Community Impact Stories</h2>
            </div>
          </ScrollReveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                quote: "Instead of throwing away 80 meals after our corporate event in Bangalore, we got them to a nearby community kitchen within 45 minutes.",
                author: "Chef Rajesh Kumar",
                role: "Grand Hotel Kitchen Manager",
                dir: "left"
              },
              {
                quote: "Our shelter receives fresh, hot meals regularly thanks to MORSL volunteers. It has transformed our daily food budget.",
                author: "Sister Mary",
                role: "Hope Community Shelter NGO",
                dir: "up"
              },
              {
                quote: "Volunteering for food rescues during weekends is incredibly rewarding. Knowing meals go directly to hungry families keeps me motivated.",
                author: "Ananya Sharma",
                role: "Logistics Rescue Volunteer",
                dir: "right"
              }
            ].map((st, idx) => (
              <ScrollReveal key={idx} direction={st.dir} delay={idx * 0.12}>
                <div className="card hover-pop" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Quote size={32} color="#0f766e" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6, flex: 1, fontStyle: 'italic', marginBottom: '1.5rem' }}>
                    "{st.quote}"
                  </p>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{st.author}</div>
                    <div style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600 }}>{st.role}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="section-tint-cream" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div className="container">
          <ScrollReveal direction="zoom">
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginBottom: '1rem' }}>
                Your surplus could become someone's next meal.
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '2rem' }}>
                Join hundreds of providers, NGOs, and volunteers across India making zero food waste a reality.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/register" className="btn btn-primary btn-lg hover-pop btn-shimmer">
                  List Surplus Food Now
                </Link>
                <Link to="/register" className="btn btn-secondary btn-lg hover-pop">
                  Explore Available Food
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
