import React from 'react';

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '12px', style = {} }) => {
  return (
    <div
      className="shimmer-box"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
};

export default Skeleton;
