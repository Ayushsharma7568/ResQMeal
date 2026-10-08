import React, { useRef } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

/**
 * AnimatedCounter Component
 * Safely renders count-up animation for numeric values.
 * NEVER renders NaN, undefined, or null. Fallback defaults to "0" or custom string.
 */
export const AnimatedCounter = ({
  value,
  prefix = '',
  suffix = '',
  duration = 1200,
  className = '',
  decimals = 0,
  fallback = '0',
}) => {
  const ref = useRef(null);

  // Check if value is valid
  const isValid = value !== null && value !== undefined && !isNaN(value);

  // Animate count using ref observer
  const animatedValue = useCountUp(isValid ? value : 0, {
    duration,
    elementRef: ref,
  });

  // Safe formatting
  let displayContent;
  if (!isValid && typeof value === 'string' && value.trim() === '') {
    displayContent = fallback;
  } else {
    const numToFormat = isNaN(animatedValue) ? 0 : animatedValue;
    const formatted = decimals > 0
      ? numToFormat.toFixed(decimals)
      : Math.round(numToFormat).toLocaleString();

    displayContent = `${prefix}${formatted}${suffix}`;
  }

  return (
    <span ref={ref} className={`animated-counter ${className}`}>
      {displayContent}
    </span>
  );
};

export default AnimatedCounter;
