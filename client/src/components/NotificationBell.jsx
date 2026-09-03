import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../utils/api';
import { timeAgo } from '../lib/format';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unread } = useQuery({
    queryKey: ['notificationsUnread'],
    queryFn: async () => (await api.get('/notifications/unread-count')).data.count,
    refetchInterval: 60000,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications?limit=15')).data,
    enabled: open,
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
    },
  });

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="font-semibold text-slate-200">Notifications</span>
            <button
              onClick={() => markAll.mutate()}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/70">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>
            )}
            {items.map((n) => (
              <button
                key={n._id}
                onClick={() => {
                  markOne.mutate(n._id);
                  if (n.link) navigate(n.link);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors ${
                  n.read ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                  <div className={n.read ? 'pl-4' : ''}>
                    <p className="text-sm font-medium text-slate-200">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
