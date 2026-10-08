import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onCloseRef.current?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  const getBgColor = () => {
    switch (type) {
      case 'success': return '#0f766e';
      case 'error': return '#dc2626';
      case 'warning': return '#d97706';
      case 'info':
      default: return '#2563eb';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 size={20} />;
      case 'error':
      case 'warning': return <AlertCircle size={20} />;
      default: return <Info size={20} />;
    }
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: getBgColor(),
            color: '#ffffff',
            boxShadow: '0 12px 25px -5px rgba(0, 0, 0, 0.25)',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          {getIcon()}
          <span>{message}</span>
          <button
            onClick={onClose}
            className="hover-pop"
            style={{ color: 'rgba(255, 255, 255, 0.8)', marginLeft: '0.5rem', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
