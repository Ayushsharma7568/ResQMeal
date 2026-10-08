import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api/notificationApi';
import { Bell, Check, CheckCheck, Clock } from 'lucide-react';

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getMyNotifications({ limit: 10 });
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      // Quiet fail if unauthenticated
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15-second poll
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleNotificationClick = (item) => {
    setOpen(false);
    if (!item.read) {
      notificationApi.markAsRead(item._id);
    }

    // Navigate to relevant portal based on entity
    if (item.relatedEntityType === 'FoodListing') {
      navigate('/seeker');
    } else if (item.relatedEntityType === 'Delivery') {
      navigate('/volunteer');
    } else if (item.relatedEntityType === 'FoodClaim') {
      navigate('/provider');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '0.45rem',
          borderRadius: '8px',
          color: '#475569',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: open ? '#f1f5f9' : 'transparent'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '45px',
            width: '340px',
            maxHeight: '420px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease forwards'
          }}
        >
          {/* Header */}
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fdfbf7' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: n.read ? '#ffffff' : '#f0fdfa',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = n.read ? '#f8fafc' : '#ccfbf1')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = n.read ? '#ffffff' : '#f0fdfa')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: n.read ? 600 : 800, color: '#0f172a' }}>{n.title}</span>
                    {!n.read && (
                      <button onClick={(e) => handleMarkAsRead(n._id, e)} title="Mark as read" style={{ color: '#0f766e', padding: '2px' }}>
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, margin: '0.2rem 0' }}>{n.message}</p>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.3rem' }}>
                    <Clock size={12} /> {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No notifications right now.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
