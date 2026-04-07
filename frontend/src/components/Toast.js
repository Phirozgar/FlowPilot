import React, { useState, useEffect, useCallback } from 'react';

let showToastFn = () => {};

export const toast = {
  error: (msg) => showToastFn(msg, 'error'),
  success: (msg) => showToastFn(msg, 'success'),
  info: (msg) => showToastFn(msg, 'info'),
  warn: (msg) => showToastFn(msg, 'warn'),
};

const ICONS = {
  error: '✕',
  success: '✓',
  info: 'ℹ',
  warn: '⚠',
};

const COLORS = {
  error: 'var(--color-danger)',
  success: 'var(--color-success)',
  info: 'var(--color-info)',
  warn: 'var(--color-warning)',
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  useEffect(() => {
    showToastFn = addToast;
  }, [addToast]);

  const dismiss = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  };

  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: '0.75rem', pointerEvents: 'none',
      maxWidth: '420px', width: '100%'
    }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => dismiss(t.id)} style={{
          pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem',
          background: 'rgba(26, 29, 36, 0.95)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${COLORS[t.type]}40`,
          borderLeft: `4px solid ${COLORS[t.type]}`,
          borderRadius: '12px',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)`,
          cursor: 'pointer',
          animation: t.exiting ? 'toastOut 0.3s ease forwards' : 'toastIn 0.35s ease forwards',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: `${COLORS[t.type]}20`,
            color: COLORS[t.type],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
          }}>{ICONS[t.type]}</div>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          <span style={{ opacity: 0.3, fontSize: '1.1rem', fontWeight: 700, flexShrink: 0 }}>×</span>
        </div>
      ))}
      <style>{`
        @keyframes toastIn { from { opacity:0; transform: translateX(60px) scale(0.95); } to { opacity:1; transform: translateX(0) scale(1); } }
        @keyframes toastOut { from { opacity:1; transform: translateX(0) scale(1); } to { opacity:0; transform: translateX(60px) scale(0.95); } }
      `}</style>
    </div>
  );
};

export default ToastContainer;
