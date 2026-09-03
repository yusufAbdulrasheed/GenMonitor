import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Paperclip, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { WO_STATUS_STYLES, PRIORITY_STYLES, titleCase, fmtDateTime } from '../lib/format';

const NEXT_STATUS = {
  open: ['assigned', 'in_progress', 'cancelled'],
  assigned: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

const ASSET_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

const WorkOrderDrawer = ({ id, onClose, assignees, canManage }) => {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [part, setPart] = useState({ name: '', quantity: 1, unitCost: 0 });

  const { data: wo, isLoading } = useQuery({
    queryKey: ['workOrder', id],
    queryFn: async () => (await api.get(`/work-orders/${id}`)).data,
  });

  const common = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', id] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrderStats'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  };

  const statusMut = useMutation({ mutationFn: (status) => api.patch(`/work-orders/${id}/status`, { status }), ...common });
  const assignMut = useMutation({ mutationFn: (assignee) => api.patch(`/work-orders/${id}/assign`, { assignee: assignee || null }), ...common });
  const laborMut = useMutation({ mutationFn: (body) => api.put(`/work-orders/${id}`, body), ...common });
  const partAddMut = useMutation({ mutationFn: (body) => api.post(`/work-orders/${id}/parts`, body), ...common });
  const partDelMut = useMutation({ mutationFn: (partId) => api.delete(`/work-orders/${id}/parts/${partId}`), ...common });
  const signMut = useMutation({
    mutationFn: (notes) => api.post(`/work-orders/${id}/sign-off`, { notes }),
    ...common,
    onSuccess: (...a) => {
      common.onSuccess(...a);
      toast.success('Signed off');
    },
  });
  const uploadMut = useMutation({
    mutationFn: (formData) => api.post(`/work-orders/${id}/attachments`, formData),
    ...common,
    onSuccess: (...a) => {
      common.onSuccess(...a);
      toast.success('File attached');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading || !wo ? (
          <div className="p-8 text-emerald-500 animate-pulse">Loading…</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-slate-500">{wo.code}</p>
                <h2 className="text-2xl font-bold text-slate-100">{wo.title}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {wo.generatorId?.generatorId} · {wo.type} ·{' '}
                  <span className={PRIORITY_STYLES[wo.priority]}>{titleCase(wo.priority)}</span>
                </p>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${WO_STATUS_STYLES[wo.status]}`}>
                {titleCase(wo.status)}
              </span>
              {wo.isOverdue && <span className="text-xs text-rose-400 font-medium">SLA breached</span>}
              {wo.slaDueAt && <span className="text-xs text-slate-500">due {fmtDateTime(wo.slaDueAt)}</span>}
            </div>

            {wo.description && <p className="text-sm text-slate-300">{wo.description}</p>}

            {canManage && NEXT_STATUS[wo.status]?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {NEXT_STATUS[wo.status].map((s) => (
                  <button
                    key={s}
                    onClick={() => statusMut.mutate(s)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    → {titleCase(s)}
                  </button>
                ))}
              </div>
            )}

            {/* Assignment */}
            <Section title="Assignee">
              {canManage ? (
                <select
                  value={wo.assignee?._id || ''}
                  onChange={(e) => assignMut.mutate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 w-full"
                >
                  <option value="">Unassigned</option>
                  {assignees?.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-300">{wo.assignee?.name || 'Unassigned'}</p>
              )}
            </Section>

            {/* Checklist */}
            {wo.checklist?.length > 0 && (
              <Section title="Checklist">
                <ul className="space-y-1">
                  {wo.checklist.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={c.done}
                        disabled={!canManage}
                        onChange={() => {
                          const checklist = wo.checklist.map((x, xi) => (xi === i ? { label: x.label, done: !x.done } : { label: x.label, done: x.done }));
                          laborMut.mutate({ checklist });
                        }}
                      />
                      <span className={c.done ? 'line-through text-slate-500' : ''}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Parts & labor */}
            <Section title={`Parts & Labor — $${wo.costTotal?.toFixed(2) ?? '0.00'}`}>
              <div className="space-y-1 mb-3">
                {wo.parts?.map((p) => (
                  <div key={p._id} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="flex-1">{p.name}</span>
                    <span className="text-slate-500">×{p.quantity} @ ${p.unitCost}</span>
                    {canManage && (
                      <button onClick={() => partDelMut.mutate(p._id)} className="text-slate-500 hover:text-rose-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canManage && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!part.name) return;
                      partAddMut.mutate({ ...part, quantity: Number(part.quantity), unitCost: Number(part.unitCost) });
                      setPart({ name: '', quantity: 1, unitCost: 0 });
                    }}
                    className="flex gap-2 mb-3"
                  >
                    <input
                      placeholder="Part"
                      value={part.name}
                      onChange={(e) => setPart((p) => ({ ...p, name: e.target.value }))}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                    />
                    <input
                      type="number" min="0" value={part.quantity}
                      onChange={(e) => setPart((p) => ({ ...p, quantity: e.target.value }))}
                      className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                    />
                    <input
                      type="number" min="0" step="0.01" value={part.unitCost}
                      onChange={(e) => setPart((p) => ({ ...p, unitCost: e.target.value }))}
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                    />
                    <button type="submit" className="px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200">
                      <Plus size={16} />
                    </button>
                  </form>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Labor hrs</span>
                    <input
                      type="number" min="0" step="0.5" defaultValue={wo.laborHours ?? 0}
                      onBlur={(e) => laborMut.mutate({ laborHours: Number(e.target.value) })}
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                    />
                    <span className="text-slate-400">@ rate</span>
                    <input
                      type="number" min="0" defaultValue={wo.laborRate ?? 50}
                      onBlur={(e) => laborMut.mutate({ laborRate: Number(e.target.value) })}
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                    />
                  </div>
                </>
              )}
            </Section>

            {/* Attachments */}
            <Section title="Attachments">
              <div className="space-y-1 mb-2">
                {wo.attachments?.map((a) => (
                  <a
                    key={a._id}
                    href={`${ASSET_ORIGIN}${a.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    <Paperclip size={14} /> {a.originalName || a.filename}
                  </a>
                ))}
                {(!wo.attachments || wo.attachments.length === 0) && (
                  <p className="text-sm text-slate-500">None</p>
                )}
              </div>
              {canManage && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append('file', file);
                      uploadMut.mutate(fd);
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
                  >
                    <Paperclip size={14} /> Upload file
                  </button>
                </>
              )}
            </Section>

            {/* Timeline */}
            <Section title="Timeline">
              <ol className="space-y-2 border-l border-slate-800 pl-4">
                {[...(wo.timeline || [])].reverse().map((t) => (
                  <li key={t._id} className="text-sm">
                    <p className="text-slate-300">
                      {titleCase(t.action)}
                      {t.fromStatus && ` — ${titleCase(t.fromStatus)} → ${titleCase(t.toStatus)}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.byName || 'System'} · {fmtDateTime(t.at)}
                      {t.note ? ` · ${t.note}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </Section>

            {/* Sign-off */}
            {canManage && wo.status !== 'completed' && wo.status !== 'cancelled' && (
              <SignOff onSubmit={(notes) => signMut.mutate(notes)} />
            )}
            {wo.signOff?.at && (
              <p className="text-sm text-emerald-400">
                Signed off by {wo.signOff.byName} · {fmtDateTime(wo.signOff.at)}
                {wo.signOff.notes ? ` — ${wo.signOff.notes}` : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{title}</h3>
    {children}
  </div>
);

const SignOff = ({ onSubmit }) => {
  const [notes, setNotes] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(notes);
      }}
      className="border-t border-slate-800 pt-4"
    >
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Sign-off notes (optional)"
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 mb-2"
      />
      <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg">
        Complete &amp; sign off
      </button>
    </form>
  );
};

export default WorkOrderDrawer;
