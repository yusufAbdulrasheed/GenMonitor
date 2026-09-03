import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, Play, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { shortDate, num } from '../lib/format';
import MaintenancePlanModal from '../components/MaintenancePlanModal';

const PLANNER_ROLES = ['Admin', 'Engineer'];

const nextDueLabel = (plan) => {
  const nd = plan.nextDue;
  if (!nd) return '—';
  if (nd.mode === 'days') {
    const days = Math.round((new Date(nd.dueAt) - Date.now()) / 86400e3);
    return nd.due ? 'Due now' : `in ${days}d (${shortDate(nd.dueAt)})`;
  }
  const remaining = nd.dueRuntimeHours - (plan.generatorId?.runtimeHours ?? 0);
  return nd.due ? 'Due now' : `in ${num(remaining, 0)} run-hrs`;
};

const MaintenancePlans = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canPlan = PLANNER_ROLES.includes(user?.role);

  const [modal, setModal] = useState({ open: false, plan: null });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['maintenancePlans'],
    queryFn: async () => (await api.get('/maintenance-plans')).data,
  });
  const { data: generators } = useQuery({
    queryKey: ['generatorOptions'],
    queryFn: async () => (await api.get('/generators?limit=200&isDecommissioned=false')).data.generators,
    enabled: canPlan,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenancePlans'] });
    queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
  };

  const saveMut = useMutation({
    mutationFn: ({ id, body }) => (id ? api.put(`/maintenance-plans/${id}`, body) : api.post('/maintenance-plans', body)),
    onSuccess: () => {
      toast.success('Plan saved');
      invalidate();
      setModal({ open: false, plan: null });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Save failed'),
  });
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/maintenance-plans/${id}`),
    onSuccess: () => {
      toast.success('Plan deleted');
      invalidate();
    },
  });
  const sweepMut = useMutation({
    mutationFn: () => api.post('/maintenance-plans/run-sweep'),
    onSuccess: ({ data }) => {
      toast.success(`Sweep done — ${data.created} work order(s) created`);
      invalidate();
    },
  });

  return (
    <div className="flex-1 p-8 overflow-auto bg-slate-950">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <CalendarClock className="text-emerald-500" size={30} /> Maintenance Plans
            </h1>
            <p className="text-slate-400 mt-1">Recurring schedules that auto-generate preventive work orders.</p>
          </div>
          {canPlan && (
            <div className="flex gap-2">
              <button
                onClick={() => sweepMut.mutate()}
                disabled={sweepMut.isPending}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm"
              >
                <Play size={16} /> Run sweep
              </button>
              <button
                onClick={() => setModal({ open: true, plan: null })}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium"
              >
                <Plus size={18} /> New Plan
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Generator</th>
                <th className="px-5 py-3">Interval</th>
                <th className="px-5 py-3">Next due</th>
                <th className="px-5 py-3">Active</th>
                {canPlan && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-emerald-500 animate-pulse">Loading…</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No maintenance plans yet.</td></tr>
              ) : (
                plans.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-slate-200">{p.name}</td>
                    <td className="px-5 py-3">{p.generatorId?.generatorId || '—'}</td>
                    <td className="px-5 py-3">
                      every {p.intervalValue} {p.intervalType === 'days' ? 'days' : 'run-hrs'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={p.nextDue?.due ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                        {nextDueLabel(p)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs ${p.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {p.isActive ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    {canPlan && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setModal({ open: true, plan: p })} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => window.confirm('Delete this plan?') && delMut.mutate(p._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canPlan && (
        <MaintenancePlanModal
          isOpen={modal.open}
          plan={modal.plan}
          generators={generators}
          onClose={() => setModal({ open: false, plan: null })}
          onSubmit={(body) => saveMut.mutate({ id: modal.plan?._id, body })}
          isSaving={saveMut.isPending}
        />
      )}
    </div>
  );
};

export default MaintenancePlans;
