import React from 'react';

const badgeVariantMap = {
  AVAILABLE: 'badge-green',
  APPROVED: 'badge-green',
  COMPLETED: 'badge-green',
  CONFIRMED: 'badge-green',
  DELIVERED: 'badge-green',

  ASSIGNED: 'badge-blue',
  PICKED_UP: 'badge-blue',
  PICKUP_ASSIGNED: 'badge-blue',
  IN_TRANSIT: 'badge-blue',

  PENDING: 'badge-amber',
  UNASSIGNED: 'badge-amber',
  CLAIMED: 'badge-amber',

  REJECTED: 'badge-red',
  CANCELLED: 'badge-red',
  EXPIRED: 'badge-red',

  FOOD_PROVIDER: 'badge-blue',
  FOOD_SEEKER: 'badge-green',
  VOLUNTEER: 'badge-amber',
  ADMIN: 'badge-red'
};

export const Badge = ({ children, variant, status, className = '' }) => {
  const cssClass = variant
    ? `badge-${variant}`
    : badgeVariantMap[status] || 'badge-gray';

  const label = children || (status ? status.replace('_', ' ') : '');

  return (
    <span className={`badge ${cssClass} hover-pop ${className}`} style={{ transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}>
      {label}
    </span>
  );
};

export default Badge;
