import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { WO_STATUS_STYLES, PRIORITY_STYLES, titleCase, shortDate } from '../lib/format';
import WorkOrderModal from '../components/WorkOrderModal';
import WorkOrderDrawer from '../components/WorkOrderDrawer';

const MANAGE_ROLES = ['Admin', 'Engineer', 'Technician'];

const WorkOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = MANAGE_ROLES.includes(user?.role);

  const [filters, setFilters] = useState({ status: '', priority: '', mine: false, overdue: false });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workOrders', filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filters.status) p.set('status', filters.status);
      if (filters.priority) p.set('priority', filters.priority);
      if (filters.mine) p.set('mine', 'true');
      if (filters.overdue) p.set('overdue', 'true');
      p.set('limit', '100');
      return (await api.get(`/work-orders?${p}`)).data;
    },
    refetchInterval: 30000,
  });

  const { data: generators } = useQuery({
    queryKey: ['generatorOptions'],
    queryFn: async () => (await api.get('/generators?limit=200&isDecommissioned=false')).data.generators,
    enabled: canManage,
  });
  const { data: assignees } = useQuery({
    queryKey: ['assignableUsers'],
    queryFn: async () => (await api.get('/users/assignable')).data,
    enabled: canManage,
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post('/work-orders', body),
    onSuccess: () => {
      toast.success('Work order created');
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
      setCreateOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
  });

  const rows = data?.workOrders || [];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-3">
              <ClipboardList className="text-emerald-500 shrink-0" size={30} /> Work Orders
            </h1>
            <p className="text-slate-400 mt-1">Assign, track, and close corrective &amp; preventive jobs.</p>
          </div>
          {canManage && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium shrink-0"
            >
              <Plus size={18} /> New Work Order
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
          >
            <option value="">All statuses</option>
            {Object.keys(WO_STATUS_STYLES).map((s) => (
              <option key={s} value={s}>{titleCase(s)}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
          >
            <option value="">Any priority</option>
            {['low', 'medium', 'high', 'critical'].map((p) => (
              <option key={p} value={p}>{titleCase(p)}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300 px-2">
            <input type="checkbox" checked={filters.mine} onChange={(e) => setFilters((f) => ({ ...f, mine: e.target.checked }))} />
            Assigned to me
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 px-2">
            <input type="checkbox" checked={filters.overdue} onChange={(e) => setFilters((f) => ({ ...f, overdue: e.target.checked }))} />
            Overdue only
          </label>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
         <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Generator</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assignee</th>
                <th className="px-5 py-3">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-emerald-500 animate-pulse">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No work orders.</td></tr>
              ) : (
                rows.map((wo) => (
                  <tr
                    key={wo._id}
                    onClick={() => setSelectedId(wo._id)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{wo.code}</td>
                    <td className="px-5 py-3 text-slate-200">{wo.title}</td>
                    <td className="px-5 py-3">{wo.generatorId?.generatorId || '—'}</td>
                    <td className={`px-5 py-3 font-medium ${PRIORITY_STYLES[wo.priority]}`}>{titleCase(wo.priority)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${WO_STATUS_STYLES[wo.status]}`}>
                        {titleCase(wo.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{wo.assignee?.name || 'Unassigned'}</td>
                    <td className="px-5 py-3">
                      <span className={wo.isOverdue ? 'text-rose-400 flex items-center gap-1' : 'text-slate-400'}>
                        {wo.isOverdue && <AlertTriangle size={12} />}
                        {shortDate(wo.slaDueAt)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
         </div>
        </div>
      </div>

      {canManage && (
        <WorkOrderModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={(body) => createMut.mutate(body)}
          generators={generators}
          assignees={assignees}
          isSaving={createMut.isPending}
        />
      )}

      {selectedId && (
        <WorkOrderDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          assignees={assignees}
          canManage={canManage}
        />
      )}
    </div>
  );
};

export default WorkOrders;
