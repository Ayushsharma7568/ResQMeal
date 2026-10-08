import React from 'react';
import { CheckCircle2, Clock, Truck, PackageCheck, UserCheck, AlertCircle } from 'lucide-react';

const STEPS = [
  { key: 'UNASSIGNED', label: 'Created', icon: Clock },
  { key: 'ASSIGNED', label: 'Volunteer Assigned', icon: UserCheck },
  { key: 'PICKED_UP', label: 'Food Picked Up', icon: Truck },
  { key: 'DELIVERED', label: 'Food Delivered', icon: PackageCheck },
  { key: 'COMPLETED', label: 'Receipt Confirmed', icon: CheckCircle2 }
];

export const StatusTimeline = ({ currentStatus, delivery }) => {
  const getStepState = (stepKey, index) => {
    if (currentStatus === 'CANCELLED') return 'cancelled';
    
    // Map current status to step index
    const statusOrder = ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'RECEIVED', 'COMPLETED'];
    let currentIndex = statusOrder.indexOf(currentStatus);
    if (currentStatus === 'RECEIVED') currentIndex = 4; // Treated as completed phase
    
    const stepIndex = statusOrder.indexOf(stepKey);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'upcoming';
  };

  if (currentStatus === 'CANCELLED') {
    return (
      <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertCircle size={18} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Task has been cancelled</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '1.25rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {/* Background Connecting Line */}
        <div style={{ position: 'absolute', top: '18px', left: '30px', right: '30px', height: '3px', backgroundColor: '#e2e8f0', zIndex: 1 }} />
        
        {STEPS.map((step, idx) => {
          const state = getStepState(step.key, idx);
          const Icon = step.icon;

          let iconBg = '#ffffff';
          let iconBorder = '#cbd5e1';
          let iconColor = '#94a3b8';

          if (state === 'completed') {
            iconBg = '#0f766e';
            iconBorder = '#0f766e';
            iconColor = '#ffffff';
          } else if (state === 'active') {
            iconBg = '#ccfbf1';
            iconBorder = '#0f766e';
            iconColor = '#0f766e';
          }

          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: iconBg,
                  border: `2px solid ${iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: iconColor,
                  transition: 'all 0.3s ease',
                  boxShadow: state === 'active' ? '0 0 0 4px rgba(15, 118, 110, 0.15)' : 'none'
                }}
              >
                <Icon size={18} />
              </div>
              <span
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: state === 'active' ? 700 : 500,
                  color: state === 'active' ? '#0f766e' : state === 'completed' ? '#0f172a' : '#94a3b8',
                  textAlign: 'center'
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
