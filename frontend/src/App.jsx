import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PageTransition } from './components/common/PageTransition';
import { PastelBackground } from './components/common/PastelBackground';
import { SplashScreen } from './components/common/SplashScreen';

// Pages
import { LandingPage } from './pages/public/LandingPage';
import { ImpactAnalytics } from './pages/dashboard/ImpactAnalytics';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Dashboards
import { ProviderDashboard } from './pages/dashboard/ProviderDashboard';
import { SeekerDashboard } from './pages/dashboard/SeekerDashboard';
import { VolunteerDashboard } from './pages/dashboard/VolunteerDashboard';
import { AdminDashboard } from './pages/dashboard/AdminDashboard';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/impact" element={<PageTransition><ImpactAnalytics /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />

        {/* Protected Role Dashboards */}
        <Route
          path="/provider"
          element={
            <ProtectedRoute allowedRoles={['FOOD_PROVIDER', 'ADMIN']}>
              <PageTransition><ProviderDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/seeker"
          element={
            <ProtectedRoute allowedRoles={['FOOD_SEEKER', 'ADMIN']}>
              <PageTransition><SeekerDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/volunteer"
          element={
            <ProtectedRoute allowedRoles={['VOLUNTEER', 'ADMIN']}>
              <PageTransition><VolunteerDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PageTransition><AdminDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PastelBackground />
      <SplashScreen>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </SplashScreen>
    </AuthProvider>
  );
}
