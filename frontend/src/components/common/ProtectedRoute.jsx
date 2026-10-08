import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from './Skeleton';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Skeleton width="100px" height="100px" borderRadius="50%" />
        <Skeleton width="200px" height="24px" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect user to their own role dashboard
    switch (user.role) {
      case 'FOOD_PROVIDER': return <Navigate to="/provider" replace />;
      case 'FOOD_SEEKER': return <Navigate to="/seeker" replace />;
      case 'VOLUNTEER': return <Navigate to="/volunteer" replace />;
      case 'ADMIN': return <Navigate to="/admin" replace />;
      default: return <Navigate to="/" replace />;
    }
  }

  return children;
};
