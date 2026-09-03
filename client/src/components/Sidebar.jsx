import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Server,
  CalendarClock,
  Bell,
  FileText,
  Users,
  LogOut,
  Map,
  ClipboardList,
  BarChart3,
  History,
  KeyRound,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const role = user?.role;

  const { data: alertStats } = useQuery({
    queryKey: ['alertStats'],
    queryFn: async () => (await api.get('/alerts/stats')).data,
    refetchInterval: 30000,
  });
  const { data: woStats } = useQuery({
    queryKey: ['workOrderStats'],
    queryFn: async () => (await api.get('/work-orders/stats')).data,
    refetchInterval: 30000,
  });

  const nav = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Fleet map', path: '/map', icon: Map },
    { name: 'Generators', path: '/generators', icon: Server },
    { name: 'Alerts', path: '/alerts', icon: Bell, badge: alertStats?.total, badgeTone: alertStats?.critical ? 'bad' : 'warn' },
    { name: 'Work orders', path: '/work-orders', icon: ClipboardList, badge: woStats?.overdue, badgeTone: 'bad' },
    { name: 'Maintenance', path: '/maintenance-plans', icon: CalendarClock },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Reports', path: '/reports', icon: FileText, roles: ['Admin', 'Engineer', 'NOC Manager'] },
  ];

  const admin = [
    { name: 'Activity log', path: '/activity', icon: History, roles: ['Admin', 'NOC Manager'] },
    { name: 'Thresholds', path: '/thresholds', icon: SlidersHorizontal, roles: ['Admin', 'Engineer'] },
    { name: 'Access', path: '/users', icon: Users, roles: ['Admin'] },
    { name: 'API keys', path: '/api-keys', icon: KeyRound, roles: ['Admin'] },
  ];

  const visible = (items) => items.filter((i) => !i.roles || i.roles.includes(role));

  const linkClass = ({ isActive }) =>
    `relative flex items-center gap-3 pl-4 pr-3 py-2 text-[13px] transition-colors ${
      isActive
        ? 'text-slate-100 font-medium bg-slate-800'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`;

  const Badge = ({ value, tone }) =>
    value > 0 ? (
      <span
        className="ml-auto text-[10px] font-semibold tabular-nums px-1.5 py-px rounded-sm"
        style={
          tone === 'bad'
            ? { background: '#f0d9d4', color: '#8c3028' }
            : { background: '#f3e6cc', color: '#855b15' }
        }
      >
        {value}
      </span>
    ) : null;

  return (
    <div className="h-screen w-60 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800">
        <Bolt className="text-cyan-400" />
        <span className="font-mono text-sm font-semibold tracking-wide text-slate-100">GENMONITOR</span>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {visible(nav).map((item) => (
          <NavLink key={item.name} to={item.path} end={item.path === '/'} className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-400" />}
                <item.icon size={16} strokeWidth={1.75} />
                <span>{item.name}</span>
                <Badge value={item.badge} tone={item.badgeTone} />
              </>
            )}
          </NavLink>
        ))}

        {visible(admin).length > 0 && (
          <>
            <p className="px-4 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Administration
            </p>
            {visible(admin).map((item) => (
              <NavLink key={item.name} to={item.path} className={linkClass}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-400" />}
                    <item.icon size={16} strokeWidth={1.75} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2.5">
          <NavLink to="/profile" className="flex items-center gap-2.5 min-w-0 group flex-1">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center text-[11px] font-semibold uppercase"
              style={{ background: '#e7e3d8', color: '#8f3714' }}
            >
              {user?.name?.substring(0, 2) || 'AD'}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-200 truncate group-hover:text-cyan-400" title={user?.name}>
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] text-slate-500">{role || 'Guest'}</p>
            </div>
          </NavLink>
          <button
            onClick={() => logout()}
            className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-400/10 rounded-sm transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Bolt = ({ className }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className={className}
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);

export default Sidebar;
