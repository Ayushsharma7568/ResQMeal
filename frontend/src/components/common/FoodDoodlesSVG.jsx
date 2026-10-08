import React from 'react';

/**
 * FoodDoodlesSVG Component
 * Hand-drawn minimal line SVG illustrations for food rescue aesthetics.
 * Styled in subtle pastel green/sage with low opacity.
 */
export const FoodDoodlesSVG = ({ type, size = 32, color = 'rgba(15, 118, 110, 0.15)', className = '' }) => {
  const getDoodlePath = () => {
    switch (type) {
      case 'apple':
        return (
          <path d="M12 2C12.8 3.2 13.5 4 14.5 4M12 7C9 4 5 5 4 8C3 11 4.5 15 7.5 18.5C9.5 21 11.5 21.5 12 21.5C12.5 21.5 14.5 21 16.5 18.5C19.5 15 21 11 20 8C19 5 15 4 12 7Z" />
        );
      case 'carrot':
        return (
          <path d="M18 3L21 6M17 7L6 18C4.5 19.5 3 21 3 21C3 21 4.5 19.5 6 18M18 3C16 3 14 5 14 5L5 14C3.5 15.5 3 17 3 17L7 21C7 21 8.5 20.5 10 19L19 10C19 10 21 8 21 6C21 4 19.5 3 18 3Z" />
        );
      case 'leaf':
        return (
          <path d="M11 20A9 9 0 0 1 2 11C2 6.5 5.5 3 10 2C15 2 22 4 22 22C4 22 6 15 11 20ZM11 20L17 14" />
        );
      case 'bread':
        return (
          <path d="M4 11C3 8 5 5 12 5C19 5 21 8 20 11V16C20 17.5 18.5 19 17 19H7C5.5 19 4 17.5 4 16V11ZM7 9C8 10 9 10.5 10.5 10M13.5 9C14.5 10 15.5 10.5 17 10" />
        );
      case 'bowl':
        return (
          <path d="M3 10C3 16 7 20 12 20C17 20 21 16 21 10H3ZM12 4V7M8 5V7M16 5V7" />
        );
      case 'rice_bowl':
        return (
          <path d="M4 11C4 7 7.5 4 12 4C16.5 4 20 7 20 11M3 11C3 16.5 7 20 12 20C17 20 21 16.5 21 11H3ZM18 2L14 7M10 2L7 7" />
        );
      case 'utensils':
        return (
          <path d="M6 3V12M9 3V12M6 8H9M7.5 12V21M16 3C14 6 14 10 16.5 12V21M17 3V8" />
        );
      case 'container':
        return (
          <path d="M5 8L12 4L19 8M5 8V18C5 19.5 6.5 21 8 21H16C17.5 21 19 19.5 19 18V8M5 8H19M12 12V17" />
        );
      case 'heart':
        return (
          <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
        );
      case 'recycle':
        return (
          <path d="M7 19L3 12L5 11M7 19L11 12H7M7 19H17M17 19L21 12L19 11M17 19L13 12H17M12 4L16 11H8L12 4Z" />
        );
      case 'sprout':
        return (
          <path d="M12 22V12M12 12C12 7 7 4 2 6C2 11 7 12 12 12ZM12 12C12 7 17 4 22 6C22 11 17 12 12 12Z" />
        );
      case 'box':
        return (
          <path d="M12 3L2 8L12 13L22 8L12 3ZM2 12L12 17L22 12M2 17L12 22L22 17" />
        );
      case 'arrow':
        return (
          <path d="M5 12H19M19 12L13 6M19 12L13 18" />
        );
      default:
        return (
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" />
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`food-doodle ${className}`}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {getDoodlePath()}
    </svg>
  );
};

export default FoodDoodlesSVG;
