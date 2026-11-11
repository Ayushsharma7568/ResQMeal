import React, { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../../api/analyticsApi';
import { getSocket } from '../../utils/socket';
import { Skeleton } from '../common/Skeleton';
import { AnimatedCounter } from '../common/AnimatedCounter';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Leaf, Utensils, Scale, TrendingUp } from 'lucide-react';

/**
 * Reusable Role-Based Impact & Sustainability Analytics Section
 * Used on both ProviderDashboard (scoped to provider) and AdminDashboard (system-wide).
 */
export const ImpactAnalyticsSection = ({ refreshTrigger = 0 }) => {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchImpact = useCallback(async () => {
    try {
      const res = await analyticsApi.getImpactAnalytics();
      if (res?.data) {
        setImpact(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch impact analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImpact();
  }, [fetchImpact, refreshTrigger]);

  // Refresh analytics in real time when a delivery completes/updates
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = (payload) => {
      if (['DELIVERED', 'COMPLETED', 'RECEIVED'].includes(payload?.status)) {
        fetchImpact();
      }
    };
    socket.on('delivery:updated', handleUpdate);
    return () => socket.off('delivery:updated', handleUpdate);
  }, [fetchImpact]);

  const totalKg = impact?.totalKgRescued ?? 0;
  const totalMeals = impact?.totalMealsProvided ?? 0;
  const co2Saved = impact?.co2OffsetKg ?? 0;
  const trends = impact?.trends || [];
  const scopeLabel = impact?.scope === 'PROVIDER' ? 'Organization Impact' : 'Network-Wide Impact';

  return (
    <div
      className="dash-section-card"
      style={{ padding: '1.5rem', marginBottom: '1.75rem' }}
      data-testid="impact-analytics-section"
    >
      <div
        className="dash-section-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <span
            className="dash-section-title"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Leaf size={19} color="#059669" />
            Impact & Sustainability
          </span>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
            Verified food rescued, community meals served, and carbon emissions prevented
          </div>
        </div>
        <span
          style={{
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {scopeLabel}
        </span>
      </div>

      {/* 3 Sustainability Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {[
          {
            label: 'Rescued Weight',
            value: totalKg,
            suffix: ' kg',
            sub: `${impact?.completedClaimsCount || 0} completed rescues`,
            icon: <Scale size={20} color="#0f766e" />,
            bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
            border: '#99f6e4',
            color: '#0f766e'
          },
          {
            label: 'Meals Served',
            value: totalMeals,
            suffix: '',
            sub: 'Estimated at 2.5 meals / kg',
            icon: <Utensils size={20} color="#047857" />,
            bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '#a7f3d0',
            color: '#047857'
          },
          {
            label: 'CO2 Emissions Saved',
            value: co2Saved,
            suffix: ' kg',
            sub: '2.5 kg CO2 prevented / kg',
            icon: <Leaf size={20} color="#2563eb" />,
            bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '#bfdbfe',
            color: '#1d4ed8'
          }
        ].map((card) => (
          <div
            key={card.label}
            className="hover-lift"
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: '14px',
              padding: '1.15rem 1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {card.label}
              </span>
              {card.icon}
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: card.color, lineHeight: 1.1 }}>
              {loading ? (
                <Skeleton height="32px" width="80px" />
              ) : (
                <>
                  <AnimatedCounter value={Math.round(card.value)} />
                  {card.suffix}
                </>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '0.35rem' }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Rescue Trend Chart */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '1.1rem 1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem', fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
          <TrendingUp size={16} color="#0f766e" />
          Food Rescued & Meals Trend
        </div>

        {loading ? (
          <Skeleton height="220px" />
        ) : trends.length > 0 ? (
          <div style={{ width: '100%', height: '230px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                <Bar dataKey="kgRescued" name="Food Rescued (kg)" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="mealsProvided" name="Meals Served" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
            No completed or delivered rescues recorded yet for trend visualization.
          </div>
        )}
      </div>
    </div>
  );
};

