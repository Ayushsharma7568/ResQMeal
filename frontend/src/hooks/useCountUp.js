import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for animating numbers from 0 → target value.
 * Uses requestAnimationFrame for smooth performance and respects prefers-reduced-motion.
 *
 * @param {number|string} targetInput - The target number to count up to
 * @param {Object} options
 * @param {number} options.duration - Animation duration in ms (default 1200)
 * @param {boolean} options.startOnMount - Start immediately without waiting for scroll trigger
 * @param {React.RefObject} options.elementRef - Ref of container to observe for scroll trigger
 * @returns {number} Current animated numeric value
 */
export const useCountUp = (targetInput, options = {}) => {
  const {
    duration = 1200,
    startOnMount = false,
    elementRef = null,
  } = typeof options === 'number' ? { duration: options } : options;

  // Clean and validate target number safely
  const parseTarget = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const target = parseTarget(targetInput);
  const [currentValue, setCurrentValue] = useState(0);
  const hasAnimated = useRef(false);
  const lastValRef = useRef(0);
  const rafIdRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setCurrentValue(target);
      lastValRef.current = target;
      return;
    }

    const animate = () => {
      hasAnimated.current = true;
      const startTime = performance.now();
      const startVal = 0;

      const tick = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const rawVal = startVal + (target - startVal) * eased;
        const nextVal = isNaN(rawVal) ? 0 : Math.round(rawVal);

        // Only trigger React state update if the integer value actually changed
        if (nextVal !== lastValRef.current) {
          lastValRef.current = nextVal;
          setCurrentValue(nextVal);
        }

        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          lastValRef.current = target;
          setCurrentValue(target);
        }
      };

      rafIdRef.current = requestAnimationFrame(tick);
    };

    let observer = null;

    if (startOnMount) {
      animate();
    } else {
      const el = elementRef?.current;
      if (!el) {
        animate();
      } else {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !hasAnimated.current) {
                animate();
                if (observer && entry.target) {
                  observer.unobserve(entry.target);
                }
              }
            });
          },
          { threshold: 0.15 }
        );

        observer.observe(el);
      }
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [target, duration, startOnMount, elementRef]);

  return isNaN(currentValue) ? 0 : currentValue;
};

export default useCountUp;
