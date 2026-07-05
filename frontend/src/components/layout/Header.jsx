import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Bell, Brain, Check, CheckCheck, ExternalLink, X } from 'lucide-react';

export default function Header({ title, subtitle }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const typeIcon = (type) => {
    if (type.includes('approved')) return '✅';
    if (type.includes('declined')) return '❌';
    if (type.includes('new_request')) return '📋';
    if (type.includes('reviewed')) return '👀';
    return '🔔';
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <header className="h-16 border-b border-violet-200/10 bg-[#0b1020]/72 backdrop-blur-2xl flex items-center justify-between px-6 shrink-0 relative z-30">
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-violet-100/55">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="interactive-lift flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-400/20 via-yellow-300/10 to-lime-400/10 border border-violet-200/20 glow-panel">
          <Brain className="w-3.5 h-3.5 text-violet-200" />
          <span className="text-[11px] font-medium text-yellow-100">AI Active</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
            className="interactive-lift relative p-2 rounded-xl text-violet-100/70 hover:text-yellow-100 hover:bg-white/5 transition-all"
          >
            <Bell className={`w-5 h-5 transition-transform ${open ? 'scale-110' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/30">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {open && (
            <div className="absolute right-0 top-12 w-96 rounded-2xl border border-violet-200/10 bg-[#11172a]/95 backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden notification-dropdown-enter">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-violet-200/10">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-400/20 text-yellow-100 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-violet-100 hover:text-yellow-100 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 transition-colors interactive-lift">
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 text-violet-100/60 hover:text-white rounded-md hover:bg-white/5 transition-colors interactive-lift">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-violet-100/45">
                    <Bell className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 border-b border-violet-200/10 hover:bg-white/5 transition-all cursor-pointer group ${
                        !n.is_read ? 'bg-violet-400/10' : ''
                      }`}
                      style={{ animation: `fadeSlideUp 0.3s ease-out ${i * 0.05}s both` }}
                      onClick={() => { if (!n.is_read) markRead(n.id); }}
                    >
                      <span className="text-lg shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${!n.is_read ? 'text-white' : 'text-violet-100/65'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && <div className="w-2 h-2 rounded-full bg-lime-400 shrink-0 shadow shadow-lime-400/50" />}
                        </div>
                        <p className="text-xs text-violet-100/45 truncate mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-violet-100/35 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={(e) => { e.stopPropagation(); setOpen(false); if (!n.is_read) markRead(n.id); }}
                          className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10 interactive-lift"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-yellow-200" />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-violet-200/10" />
        <div className="text-right">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-violet-100/50 capitalize">{user?.role}</p>
        </div>
      </div>
    </header>
  );
}
