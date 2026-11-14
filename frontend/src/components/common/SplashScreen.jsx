import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';
import { FoodDoodlesSVG } from './FoodDoodlesSVG';

/**
 * SplashScreen Component
 * Startup intro sequence for MORSL.
 *
 * Sequence (~2.8 seconds):
 * 1. Branded dark green gradient background
 * 2. Glowing Heart Logo entrance (scale 0.8 → 1.0)
 * 3. Title: MORSL
 * 4. Subtitle: FOOD RESCUE NETWORK
 * 5. Tagline: "Good food shouldn't become waste."
 * 6. Bottom attribution: Created by Incia · Harsh · Punya · Ayush
 */
export const SplashScreen = ({ children }) => {
  const [showSplash, setShowSplash] = useState(() => {
    // Check if splash was already played in current session
    const hasSeen = sessionStorage.getItem('morsl_splash_shown') || sessionStorage.getItem('dont_waste_it_splash_shown');
    return !hasSeen;
  });

  useEffect(() => {
    if (!showSplash) return;

    // Auto dismiss splash screen after ~2.8s
    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('morsl_splash_shown', 'true');
    }, 2800);

    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'radial-gradient(circle at center, #0f766e 0%, #064e3b 100%)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '3rem 1.5rem',
              overflow: 'hidden'
            }}
          >
            {/* Background floating ambient doodles */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.15 }}>
              <div style={{ position: 'absolute', top: '15%', left: '10%' }} className="doodle-float-1">
                <FoodDoodlesSVG type="apple" size={48} color="#ccfbf1" />
              </div>
              <div style={{ position: 'absolute', top: '25%', right: '12%' }} className="doodle-float-2">
                <FoodDoodlesSVG type="carrot" size={44} color="#ccfbf1" />
              </div>
              <div style={{ position: 'absolute', bottom: '25%', left: '14%' }} className="doodle-float-3">
                <FoodDoodlesSVG type="bread" size={50} color="#ccfbf1" />
              </div>
              <div style={{ position: 'absolute', bottom: '20%', right: '15%' }} className="doodle-float-1">
                <FoodDoodlesSVG type="rice_bowl" size={46} color="#ccfbf1" />
              </div>
            </div>

            {/* Top Spacer */}
            <div />

            {/* Central Branding Group */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                maxWidth: '600px'
              }}
            >
              {/* STEP 2: Heart Logo Animation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #14b8a6 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 45px rgba(204, 251, 241, 0.4)',
                  marginBottom: '1.75rem'
                }}
              >
                <Heart size={44} fill="#ffffff" color="#ffffff" />
              </motion.div>

              {/* STEP 3: MORSL Title */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: '#ffffff',
                  margin: 0,
                  textTransform: 'uppercase'
                }}
              >
                MORSL
              </motion.h1>

              {/* STEP 4: FOOD RESCUE NETWORK Subtitle */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  letterSpacing: '0.22em',
                  color: '#99f6e4',
                  textTransform: 'uppercase',
                  marginTop: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Sparkles size={14} /> FOOD RESCUE NETWORK <Sparkles size={14} />
              </motion.div>

              {/* STEP 5: Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 500,
                  fontStyle: 'italic',
                  color: '#ccfbf1',
                  marginTop: '1.25rem',
                  opacity: 0.95
                }}
              >
                "Good food shouldn't become waste."
              </motion.p>
            </motion.div>

            {/* STEP 6: Formal Creators Attribution at Bottom */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              style={{
                textAlign: 'center',
                fontSize: '0.8rem',
                letterSpacing: '0.05em',
                color: '#ccfbf1'
              }}
            >
              <div style={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.15em', opacity: 0.7, marginBottom: '0.25rem' }}>
                Created by
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', color: '#ffffff' }}>
                Incia · Harsh · Punya · Ayush
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Website Application Content */}
      <motion.div
        initial={{ opacity: showSplash ? 0 : 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: showSplash ? 2.6 : 0 }}
        style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </>
  );
};

export default SplashScreen;
