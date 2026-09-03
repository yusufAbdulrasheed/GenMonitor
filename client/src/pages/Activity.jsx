import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import api from '../utils/api';
import { titleCase, fmtDateTime } from '../lib/format';

const ENTITIES = ['Generator', 'WorkOrder', 'Alert', 'MaintenancePlan', 'ThresholdConfig', 'User', 'ApiKey', 'Auth'];

const Activity = () => {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['activity', entity, action, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page, limit: '50' });
      if (entity) p.set('entity', entity);
      if (action) p.set('action', action);
      return (await api.get(`/activity?${p}`)).data;
    },
    refetchInterval: 30000,
  });

  const events = data?.events || [];

  return (
    <div className="flex-1 p-8 overflow-auto bg-slate-950">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3 mb-2">
          <History className="text-emerald-500" size={30} /> Activity Log
        </h1>
        <p className="text-slate-400 mb-6">Immutable audit trail of every change across the system.</p>

        <div className="flex gap-3 mb-4">
          <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
            <option value="">All entities</option>
            {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
            <option value="">All actions</option>
            {['create', 'update', 'delete', 'login', 'logout', 'decommission', 'acknowledge', 'resolve', 'assign', 'status_change', 'sign_off', 'ingest'].map((a) => (
              <option key={a} value={a}>{titleCase(a)}</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-emerald-500 animate-pulse">Loading…</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No activity.</td></tr>
              ) : (
                events.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-800/30 align-top">
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{fmtDateTime(e.at)}</td>
                    <td className="px-5 py-3">{e.actor?.name || 'System'}<span className="block text-xs text-slate-500">{e.actor?.role}</span></td>
                    <td className="px-5 py-3">{titleCase(e.action)}</td>
                    <td className="px-5 py-3">
                      {e.entity}
                      {e.entityLabel && <span className="block text-xs text-slate-500">{e.entityLabel}</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 max-w-xs">
                      {e.diff
                        ? Object.entries(e.diff).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-slate-500">{k}:</span> {JSON.stringify(v.from)} → {JSON.stringify(v.to)}
                            </div>
                          ))
                        : e.meta
                        ? JSON.stringify(e.meta)
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {data?.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 text-sm text-slate-400">
              <span>Page {data.page} of {data.pages}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Prev</button>
                <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Activity;
