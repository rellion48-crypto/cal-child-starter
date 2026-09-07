import React, { useEffect, useState } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number; // ms, undefined = no auto-close
}

interface NotificationBannerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ notifications, onClose }) => {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>(notifications);

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    const timers = notifications.map((notif) => {
      if (notif.duration) {
        return setTimeout(() => {
          onClose(notif.id);
        }, notif.duration);
      }
      return null;
    });

    return () => {
      timers.forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [notifications, onClose]);

  const getBackgroundColor = (type: string): string => {
    switch (type) {
      case 'success':
        return '#d4edda';
      case 'error':
        return '#f8d7da';
      case 'warning':
        return '#fff3cd';
      case 'info':
      default:
        return '#d1ecf1';
    }
  };

  const getBorderColor = (type: string): string => {
    switch (type) {
      case 'success':
        return '#c3e6cb';
      case 'error':
        return '#f5c6cb';
      case 'warning':
        return '#ffeeba';
      case 'info':
      default:
        return '#bee5eb';
    }
  };

  const getTextColor = (type: string): string => {
    switch (type) {
      case 'success':
        return '#155724';
      case 'error':
        return '#721c24';
      case 'warning':
        return '#856404';
      case 'info':
      default:
        return '#0c5460';
    }
  };

  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000, maxWidth: '400px' }}>
      {visibleNotifications.map((notif) => (
        <div
          key={notif.id}
          style={{
            backgroundColor: getBackgroundColor(notif.type),
            color: getTextColor(notif.type),
            padding: '12px 16px',
            borderRadius: '4px',
            border: `1px solid ${getBorderColor(notif.type)}`,
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            animation: 'slideIn 0.3s ease-in-out',
          }}
        >
          <span style={{ fontSize: '14px' }}>{notif.message}</span>
          <button
            onClick={() => onClose(notif.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              marginLeft: '10px',
              color: getTextColor(notif.type),
            }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
