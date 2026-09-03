import React from 'react';
import { useSocket } from '../context/SocketContext';
import NotificationBell from './NotificationBell';

const TopBar = () => {
  const { connected } = useSocket();

  return (
    <header className="h-14 flex-shrink-0 border-b border-slate-800 bg-slate-900 flex items-center justify-end gap-4 px-6">
      <span
        className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-500"
        title={connected ? 'Real-time feed connected' : 'Real-time feed reconnecting'}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: connected ? '#3c7853' : '#b4ad9c' }}
        />
        {connected ? 'live' : 'offline'}
      </span>
      <div className="w-px h-5 bg-slate-800" />
      <NotificationBell />
    </header>
  );
};

export default TopBar;
