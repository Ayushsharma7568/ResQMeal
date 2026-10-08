import React, { useEffect, useRef } from 'react';
import { useCursorGlow } from '../../hooks/useCursorGlow';
import { FoodDoodlesSVG } from './FoodDoodlesSVG';

/**
 * PastelBackground Component
 * Renders subtle floating ambient blobs, mouse cursor glow,
 * and scattered abstract food rescue SVG line-art doodles.
 */
export const PastelBackground = () => {
  // Attach soft cursor radial glow
  useCursorGlow();

  const doodlesLayerRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let frameId;
    const handleMouseMove = (e) => {
      // Calculate small offset relative to window center (-4px to +4px)
      const x = ((e.clientX / window.innerWidth) - 0.5) * 8;
      const y = ((e.clientY / window.innerHeight) - 0.5) * 8;

      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (doodlesLayerRef.current) {
          doodlesLayerRef.current.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  // Preset organic position list for food doodles
  const doodlePositions = [
    { type: 'apple', top: '8%', left: '4%', size: 36, anim: 'doodle-float-1', delay: '0s' },
    { type: 'carrot', top: '18%', right: '6%', size: 40, anim: 'doodle-float-2', delay: '2s' },
    { type: 'leaf', top: '35%', left: '2%', size: 34, anim: 'doodle-float-3', delay: '4s' },
    { type: 'bread', top: '48%', right: '3%', size: 44, anim: 'doodle-float-1', delay: '1s' },
    { type: 'bowl', top: '65%', left: '5%', size: 38, anim: 'doodle-float-2', delay: '3s' },
    { type: 'rice_bowl', top: '78%', right: '7%', size: 42, anim: 'doodle-float-3', delay: '5s' },
    { type: 'utensils', top: '88%', left: '8%', size: 36, anim: 'doodle-float-1', delay: '2s' },
    { type: 'container', top: '28%', left: '12%', size: 34, anim: 'doodle-float-2', delay: '6s' },
    { type: 'heart', top: '12%', right: '15%', size: 32, anim: 'doodle-float-3', delay: '1s' },
    { type: 'recycle', top: '55%', right: '12%', size: 38, anim: 'doodle-float-1', delay: '4s' },
    { type: 'sprout', top: '72%', left: '15%', size: 34, anim: 'doodle-float-2', delay: '0s' },
    { type: 'box', top: '92%', right: '18%', size: 36, anim: 'doodle-float-3', delay: '3s' },
  ];

  return (
    <div className="pastel-bg-container" aria-hidden="true">
      {/* Soft pastel ambient background blobs */}
      <div className="pastel-blob blob-1" />
      <div className="pastel-blob blob-2" />
      <div className="pastel-blob blob-3" />
      <div className="pastel-blob blob-4" />
      <div className="pastel-blob blob-5" />

      {/* Scattered abstract food doodles with micro mouse parallax */}
      <div
        ref={doodlesLayerRef}
        className="doodles-layer"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translate3d(0px, 0px, 0)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {doodlePositions.map((d, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: d.top,
              left: d.left,
              right: d.right,
              animationDelay: d.delay,
              opacity: 0.16
            }}
            className={d.anim}
          >
            <FoodDoodlesSVG type={d.type} size={d.size} color="#0f766e" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PastelBackground;
