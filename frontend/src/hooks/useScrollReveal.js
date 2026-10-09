import { useEffect, useRef } from 'react';

/**
 * Custom hook that uses IntersectionObserver to add a 'revealed' class
 * to elements when they enter the viewport. Triggers ONCE per element.
 */
export const useScrollReveal = (options = {}) => {
  const ref = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-reveal--revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px 0px -40px 0px',
      }
    );

    // If ref is a container, observe all children with .scroll-reveal
    const children = el.querySelectorAll('.scroll-reveal');
    if (children.length > 0) {
      children.forEach((child) => observer.observe(child));
    } else {
      // Observe the element itself if it has the class
      if (el.classList.contains('scroll-reveal')) {
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return ref;
};
