'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Trash2, X, BellOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { NotificationOut, NotificationType } from '@/lib/types';

const TYPE_ICON: Record<NotificationType, string> = {
  welcome: '👋',
  budget_alert: '⚠️',
  subscription_due: '📅',
  info: 'ℹ️',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  welcome: 'text-primary-light',
  budget_alert: 'text-amber-400',
  subscription_due: 'text-blue-400',
  info: 'text-slate-400',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export default function NotificationBell() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationOut[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    if (!token) return;
    try {
      const { count } = await api.notifications.unreadCount(token);
      setUnread(count);
    } catch { /* silent */ }
  };

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Check for new alerts then fetch list
      await api.notifications.checkAlerts(token).catch(() => null);
      const list = await api.notifications.list(token);
      setNotifications(list);
      setUnread(list.filter(n => !n.is_read).length);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCount(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) fetchAll();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    await api.notifications.markRead(token, id).catch(() => null);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    await api.notifications.markAllRead(token).catch(() => null);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    await api.notifications.remove(token, id).catch(() => null);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-bg-elevated transition-colors"
        title="Notificaciones"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-bg-surface border border-bg-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
            <h3 className="text-sm font-semibold text-white">Notificaciones</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={handleMarkAllRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-primary-light transition-colors"
                  title="Marcar todas como leídas">
                  <CheckCheck size={13} />Leer todas
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="p-1 text-slate-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-slate-500 text-sm">Cargando…</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-slate-500">
                <BellOff size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-bg-border last:border-0 cursor-pointer transition-colors hover:bg-bg-elevated/50 ${!n.is_read ? 'bg-primary/5' : ''}`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[n.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold mb-0.5 ${!n.is_read ? TYPE_COLOR[n.type] : 'text-slate-400'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
                    className="p-1 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
