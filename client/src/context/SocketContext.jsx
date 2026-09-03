import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ socket: null, connected: false });
export const useSocket = () => useContext(SocketContext);

// The socket shares the app origin; VITE_API_URL (if set) points at the API,
// so strip a trailing /api to get the socket origin. Empty = same origin (proxy).
const SOCKET_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return undefined;
    }

    const s = io(SOCKET_URL || undefined, {
      withCredentials: true,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    setSocket(s);

    const invalidate = (...keys) =>
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', () => setConnected(false));

    s.on('telemetry:update', () => invalidate('generators', 'analyticsSummary'));
    s.on('alert:new', () => invalidate('alerts', 'alertStats', 'generators'));
    s.on('alert:updated', () => invalidate('alerts', 'alertStats'));
    s.on('workorder:new', () => invalidate('workOrders', 'workOrderStats', 'generators'));
    s.on('workorder:updated', () => invalidate('workOrders', 'workOrderStats', 'generators'));
    s.on('notification:new', (n) => {
      invalidate('notifications', 'notificationsUnread');
      toast(n.title, { icon: '🔔' });
    });

    return () => {
      s.close();
      setConnected(false);
    };
  }, [user, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>
  );
};
