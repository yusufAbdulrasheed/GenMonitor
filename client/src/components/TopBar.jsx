import React from 'react';
import { Menu } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import NotificationBell from './NotificationBell';

const TopBar = ({ onMenuClick }) => {
  const { connected } = useSocket();

  return (
    <header className="h-14 flex-shrink-0 border-b border-slate-800 bg-slate-900 flex items-center gap-3 px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="-ml-1.5 p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-4 ml-auto">
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
      </div>
    </header>
  );
};

export default TopBar;
