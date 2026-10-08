import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { listingApi } from '../../api/listingApi';
import { claimApi } from '../../api/claimApi';
import { Skeleton } from '../../components/common/Skeleton';
import { ScrollReveal } from '../../components/common/ScrollReveal';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Heart, TrendingUp, Award, Users, Building, Shield, Info, CheckCircle2 } from 'lucide-react';

export const ImpactAnalytics = () => {
  const [listings, setListings] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImpactData = async () => {
      try {
        const [listRes, claimRes] = await Promise.all([
          listingApi.getListings({ limit: 100 }),
          claimApi.getIncomingClaims({ limit: 100 })
        ]);
        setListings(listRes.data?.listings || []);
        setClaims(claimRes.data?.claims || []);
      } catch (err) {
        console.error('Impact analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchImpactData();
  }, []);

  // Compute stats from active database records
  const totalListings = listings?.length || 0;
  const completedListings = listings?.filter(l => l && l.status === 'COMPLETED') || [];
  const completedClaims = claims?.filter(c => c && c.status === 'COMPLETED') || [];
  const successfulRescuesCount = completedListings.length + completedClaims.length;

  const totalFoodRescuedKg = (listings || [])
    .filter(l => l && ['COMPLETED', 'PICKED_UP', 'DELIVERED'].includes(l.status))
    .reduce((acc, listing) => {
      const itemSum = listing.foodItems?.reduce((s, item) => {
        const qty = parseFloat(item?.quantity);
        return s + (isNaN(qty) ? 1 : qty);
      }, 0) || 0;
      return acc + itemSum;
    }, 0) || 0;

  const rawMeals = totalFoodRescuedKg * 3;
  const estimatedMealsServed = isNaN(rawMeals) ? 0 : Math.round(rawMeals);


  // Category Distribution Data from real listings
  const categoryCountMap = {};
  listings.forEach(l => {
    l.foodItems?.forEach(item => {
      const cat = item.category ? item.category.replace('_', ' ') : 'OTHER';
      categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1;
    });
  });

  const categoryChartData = Object.keys(categoryCountMap).map(key => ({
    name: key,
    value: categoryCountMap[key]
  }));

  // Status Distribution Data
  const statusCountMap = {};
  listings.forEach(l => {
    statusCountMap[l.status] = (statusCountMap[l.status] || 0) + 1;
  });

  const statusChartData = Object.keys(statusCountMap).map(key => ({
    name: key,
    count: statusCountMap[key]
  }));

  // Historical Rescues Trend Data (Grouped by month/date from real timestamps)
  const timeMap = {};
  listings.forEach(l => {
    const dateStr = new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    timeMap[dateStr] = (timeMap[dateStr] || 0) + 1;
  });

  const trendChartData = Object.keys(timeMap).map(date => ({
    date,
    listings: timeMap[date]
  }));

  const COLORS = ['#0f766e', '#059669', '#d97706', '#2563eb', '#8b5cf6', '#ec4899'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '3rem 0' }}>
        <div className="container">
          {/* Header */}
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', backgroundColor: '#ccfbf1', color: '#0f766e', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
                <TrendingUp size={16} /> Real-Time Impact Telemetry
              </div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                Platform Impact & Analytics
              </h1>
              <p style={{ fontSize: '1.05rem', color: '#64748b', marginTop: '0.5rem' }}>
                Measuring food saved, meals redistributed, and environmental waste diverted across our community network
              </p>
            </div>
          </ScrollReveal>


          {/* Key Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            <ScrollReveal direction="up" delay={0}>
              <div className="card hover-pop" style={{ padding: '1.5rem', borderRadius: '16px', height: '100%' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Estimated Meals Rescued</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f766e', margin: '0.25rem 0' }}>
                  {loading ? <Skeleton height="36px" width="100px" /> : <AnimatedCounter value={estimatedMealsServed} />}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>Nourishing Communities</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <div className="card hover-pop" style={{ padding: '1.5rem', borderRadius: '16px', height: '100%' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Food Rescued (kg)</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#059669', margin: '0.25rem 0' }}>
                  {loading ? <Skeleton height="36px" width="100px" /> : <AnimatedCounter value={totalFoodRescuedKg} suffix=" kg" />}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>Diverted from Landfills</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.2}>
              <div className="card hover-pop" style={{ padding: '1.5rem', borderRadius: '16px', height: '100%' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Successful Rescues</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#d97706', margin: '0.25rem 0' }}>
                  {loading ? <Skeleton height="36px" width="100px" /> : <AnimatedCounter value={successfulRescuesCount} />}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Completed Transfers</div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.3}>
              <div className="card hover-pop" style={{ padding: '1.5rem', borderRadius: '16px', height: '100%' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Total Food Listings</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#2563eb', margin: '0.25rem 0' }}>
                  {loading ? <Skeleton height="36px" width="100px" /> : <AnimatedCounter value={totalListings} />}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>Active Platform Posts</div>
              </div>
            </ScrollReveal>
          </div>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>
            
            {/* Chart 1: Food Listings Activity Over Time */}
            <ScrollReveal direction="up" delay={0.1}>
              <div className="card hover-pop" style={{ padding: '1.75rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem' }}>
                  Food Surplus Listings Over Time
                </h3>
                {trendChartData.length > 0 ? (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="listings" fill="#0f766e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    No historical trend data available yet.
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Chart 2: Category Breakdown */}
            <ScrollReveal direction="up" delay={0.2}>
              <div className="card hover-pop" style={{ padding: '1.75rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem' }}>
                  Surplus Food Distribution by Category
                </h3>
                {categoryChartData.length > 0 ? (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    No category distribution data available yet.
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Chart 3: Listing Status Breakdown */}
            <ScrollReveal direction="up" delay={0.3}>
              <div className="card hover-pop" style={{ padding: '1.75rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem' }}>
                  Listing Lifecycle Status Breakdown
                </h3>
                {statusChartData.length > 0 ? (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={statusChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={110} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    No status breakdown data available yet.
                  </div>
                )}
              </div>
            </ScrollReveal>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ImpactAnalytics;
