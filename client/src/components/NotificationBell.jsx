import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, CalendarClock, CarFront, CircleParking, LogIn, LogOut, Megaphone, Ticket, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { usePollingResource } from '../hooks/usePollingResource.js';
import { clearNotifications, getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService.js';

const ICONS = {
  BOOKING: Ticket,
  CHECKIN: LogIn,
  CHECKOUT: LogOut,
  CANCEL: X,
  EXTEND: CalendarClock,
  OVERSTAY: CircleParking,
  WAITLIST: CarFront,
  SYSTEM: Megaphone,
};

function timeAgo(date) {
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const loader = useCallback(async (signal) => getNotifications(token, { signal }), [token]);
  const polling = usePollingResource(loader, 20000);

  const notifications = polling.data?.notifications || [];
  const unread = polling.data?.unreadCount || 0;

  useEffect(() => {
    function onClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function openItem(notification) {
    if (notification.read) return;
    try {
      await markNotificationRead(token, notification._id);
      polling.refresh();
    } catch { /* non-critical */ }
  }

  async function markAll() {
    try {
      await markAllNotificationsRead(token);
      polling.refresh();
    } catch { /* non-critical */ }
  }

  async function clearAll() {
    try {
      await clearNotifications(token);
      polling.refresh();
    } catch { /* non-critical */ }
  }

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="notif-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell size={20} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            <div className="notif-panel-actions">
              {unread > 0 && <button className="notif-text-btn" onClick={markAll} type="button"><Check size={13} /> Mark all read</button>}
              {notifications.length > 0 && <button className="notif-text-btn" onClick={clearAll} type="button">Clear</button>}
            </div>
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <p className="notif-empty">You're all caught up.</p>
            ) : (
              notifications.map((notification) => {
                const Icon = ICONS[notification.type] || Megaphone;
                return (
                  <button
                    className={`notif-item ${notification.read ? '' : 'unread'}`}
                    key={notification._id}
                    onClick={() => openItem(notification)}
                    type="button"
                  >
                    <span className={`notif-item-icon notif-${notification.type.toLowerCase()}`}><Icon size={16} /></span>
                    <span className="notif-item-body">
                      <span className="notif-item-title">{notification.title}</span>
                      <span className="notif-item-msg">{notification.message}</span>
                      <span className="notif-item-time">{timeAgo(notification.createdAt)}</span>
                    </span>
                    {!notification.read && <span className="notif-dot" aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
