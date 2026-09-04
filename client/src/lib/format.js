export const STATUS_STYLES = {
  Running: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Standby: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Fault: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  UnderMaintenance: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Decommissioned: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

export const SEVERITY_STYLES = {
  critical: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export const WO_STATUS_STYLES = {
  open: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  assigned: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  in_progress: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  on_hold: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

export const PRIORITY_STYLES = {
  low: 'text-slate-400',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  critical: 'text-rose-400',
};

export const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const timeAgo = (date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

export const shortDate = (date) =>
  date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';

export const fmtDateTime = (date) =>
  date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const num = (v, dp = 1) => (typeof v === 'number' ? v.toFixed(dp) : '—');

// Fuel is stored as a percentage of tank capacity; convert to litres for display.
export const litresFromPct = (pct, tankSize) =>
  typeof pct === 'number' && typeof tankSize === 'number'
    ? Math.round((pct / 100) * tankSize)
    : null;
