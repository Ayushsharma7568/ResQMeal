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
  const getStepState = (stepKey) => {
    if (currentStatus === 'CANCELLED') return 'cancelled';

    // Map current status to step index
    const statusOrder = ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'RECEIVED', 'COMPLETED'];
    let currentIndex = statusOrder.indexOf(currentStatus);
    if (currentStatus === 'RECEIVED') currentIndex = 4; // Treated as completed phase
    if (currentIndex === -1) currentIndex = 0;

    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'upcoming';
  };

  const getStepTimestamp = (stepKey) => {
    if (!delivery) return null;
    let rawDate = null;
    if (stepKey === 'UNASSIGNED') rawDate = delivery.createdAt;
    else if (stepKey === 'ASSIGNED') rawDate = delivery.acceptedAt;
    else if (stepKey === 'PICKED_UP') rawDate = delivery.pickedUpAt;
    else if (stepKey === 'DELIVERED') rawDate = delivery.deliveredAt;
    else if (stepKey === 'COMPLETED') rawDate = delivery.completedAt || delivery.receivedAt;

    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (currentStatus === 'CANCELLED') {
    const cancelledDate = delivery?.updatedAt ? new Date(delivery.updatedAt) : null;
    const formattedCancelled = cancelledDate && !isNaN(cancelledDate.getTime())
      ? cancelledDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
      : null;

    return (
      <div style={{
        padding: '1rem',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '10px',
        color: '#b91c1c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Delivery Task Cancelled</span>
        </div>
        {formattedCancelled && (
          <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>
            {formattedCancelled}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '1.25rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        {/* Background Connecting Line */}
        <div style={{ position: 'absolute', top: '18px', left: '30px', right: '30px', height: '3px', backgroundColor: '#e2e8f0', zIndex: 1 }} />

        {STEPS.map((step) => {
          const state = getStepState(step.key);
          const time = getStepTimestamp(step.key);
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
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1, minWidth: 0, padding: '0 0.25rem' }}>
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
                  fontSize: '0.78rem',
                  fontWeight: state === 'active' ? 700 : 600,
                  color: state === 'active' ? '#0f766e' : state === 'completed' ? '#0f172a' : '#94a3b8',
                  textAlign: 'center',
                  lineHeight: 1.2
                }}
              >
                {step.label}
              </span>
              {time && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: state === 'active' ? '#0f766e' : '#64748b',
                    fontWeight: 500,
                    marginTop: '0.2rem'
                  }}
                >
                  {time}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {delivery?.volunteerId?.name && (
        <div style={{
          marginTop: '1.25rem',
          padding: '0.65rem 0.85rem',
          backgroundColor: '#f0fdfa',
          borderRadius: '8px',
          border: '1px solid #ccfbf1',
          fontSize: '0.8rem',
          color: '#0f766e',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <UserCheck size={14} /> Assigned Volunteer: <strong>{delivery.volunteerId.name}</strong>
          {delivery.volunteerId.phone && ` · ${delivery.volunteerId.phone}`}
        </div>
      )}
    </div>
  );
};
