import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CircleCheck, AlertOctagon, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { SEVERITY_STYLES, timeAgo, fmtDateTime } from '../lib/format';

const SEVERITY_ICON = { critical: AlertOctagon, warning: AlertTriangle, info: Info };
const MANAGER_ROLES = ['Admin', 'Engineer', 'NOC Manager'];
const RESPONDER_ROLES = [...MANAGER_ROLES, 'Technician'];

const Alerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('active');
  const [severityFilter, setSeverityFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  const canRespond = RESPONDER_ROLES.includes(user?.role);
  const canResolve = MANAGER_ROLES.includes(user?.role);

  const { data: alerts = [], isLoading, isFetching } = useQuery({
    queryKey: ['alerts', statusFilter, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter === 'active') {
        /* default on server */
      } else {
        params.set('status', statusFilter);
      }
      if (severityFilter) params.set('severity', severityFilter);
      return (await api.get(`/alerts?${params}`)).data;
    },
    refetchInterval: 20000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['alertStats'] });
  };

  const act = useMutation({
    mutationFn: ({ id, action, body }) => api.patch(`/alerts/${id}/${action}`, body),
    onSuccess: (_d, v) => {
      toast.success(v.action === 'acknowledge' ? 'Acknowledged' : 'Resolved');
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const addNote = useMutation({
    mutationFn: ({ id, body }) => api.post(`/alerts/${id}/notes`, { body }),
    onSuccess: invalidate,
  });

  const counts = alerts.reduce(
    (a, x) => ({ ...a, [x.severity]: (a[x.severity] || 0) + 1 }),
    { critical: 0, warning: 0, info: 0 }
  );

  return (
    <div className="flex-1 p-8 overflow-auto bg-slate-950">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Bell className="text-cyan-500" size={30} /> Alerts
            </h1>
            <p className="text-slate-400 mt-1">Threshold-driven conditions with acknowledge / resolve workflow.</p>
          </div>
          {isFetching && <RefreshCw className="animate-spin text-slate-500" size={18} />}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Critical', value: counts.critical, color: 'text-rose-400' },
            { label: 'Warning', value: counts.warning, color: 'text-amber-400' },
            { label: 'Info', value: counts.info, color: 'text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
          >
            <option value="active">Active</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        {isLoading && <p className="text-emerald-500 animate-pulse">Loading alerts…</p>}

        {!isLoading && alerts.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-12 border-2 border-dashed border-slate-800 rounded-xl text-center">
            <CircleCheck className="text-emerald-500" size={40} />
            <h3 className="text-xl font-bold text-slate-200">Nothing to see</h3>
            <p className="text-slate-500">No alerts match this filter.</p>
          </div>
        )}

        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity] || Info;
            const isOpen = expanded === alert._id;
            return (
              <div key={alert._id} className={`rounded-xl border ${SEVERITY_STYLES[alert.severity]}`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : alert._id)}
                  className="w-full flex items-start gap-3 p-4 text-left"
                >
                  <Icon size={20} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 font-medium">{alert.message}</p>
                    <p className="text-sm text-slate-400">
                      {alert.generatorId?.generatorId || 'Unknown'}
                      {alert.siteId?.name ? ` · ${alert.siteId.name}` : ''} · {timeAgo(alert.lastSeenAt)}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wider font-semibold px-2 py-1 rounded bg-slate-950/40">
                    {alert.status}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-800/60 p-4 space-y-3 bg-slate-950/30">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-400">
                      <span>First seen: {fmtDateTime(alert.firstSeenAt)}</span>
                      <span>Type: {alert.type}</span>
                      {alert.value != null && <span>Value: {alert.value}</span>}
                      {alert.threshold != null && <span>Threshold: {alert.threshold}</span>}
                      {alert.acknowledgedBy && <span>Ack by: {alert.acknowledgedBy.name}</span>}
                      {alert.resolvedBy && <span>Resolved by: {alert.resolvedBy.name}</span>}
                    </div>

                    {alert.notes?.length > 0 && (
                      <div className="space-y-1">
                        {alert.notes.map((n) => (
                          <p key={n._id} className="text-sm text-slate-300 bg-slate-900 rounded px-3 py-1.5">
                            <span className="text-slate-500">{n.authorName || 'Someone'}:</span> {n.body}
                          </p>
                        ))}
                      </div>
                    )}

                    {canRespond && alert.status !== 'resolved' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {alert.status === 'open' && (
                          <button
                            onClick={() => act.mutate({ id: alert._id, action: 'acknowledge' })}
                            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                          >
                            <Check size={14} /> Acknowledge
                          </button>
                        )}
                        {canResolve && (
                          <button
                            onClick={() => act.mutate({ id: alert._id, action: 'resolve' })}
                            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <CircleCheck size={14} /> Resolve
                          </button>
                        )}
                        <NoteInput onSubmit={(body) => addNote.mutate({ id: alert._id, body })} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const NoteInput = ({ onSubmit }) => {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          onSubmit(value.trim());
          setValue('');
        }
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a note…"
        className="text-sm bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 w-48"
      />
      <button type="submit" className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200">
        Add
      </button>
    </form>
  );
};

export default Alerts;
