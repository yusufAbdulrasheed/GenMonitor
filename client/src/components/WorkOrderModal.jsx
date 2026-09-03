import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const empty = {
  generatorId: '',
  title: '',
  description: '',
  type: 'corrective',
  priority: 'medium',
  scheduledDate: '',
  slaDays: 7,
  assignee: '',
};

const WorkOrderModal = ({ isOpen, onClose, onSubmit, generators, assignees, isSaving }) => {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (isOpen) setForm(empty);
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const input =
    'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={18} />
        </button>
        <h2 className="text-xl font-bold text-slate-100 mb-6 pr-8">New Work Order</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              ...form,
              slaDays: Number(form.slaDays) || 7,
              assignee: form.assignee || undefined,
              scheduledDate: form.scheduledDate || undefined,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-slate-300 mb-1">Generator</label>
            <select required value={form.generatorId} onChange={set('generatorId')} className={input}>
              <option value="">Select…</option>
              {generators?.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.generatorId} — {g.siteCode || g.siteId?.name || 'Unassigned'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Title</label>
            <input required value={form.title} onChange={set('title')} className={input} placeholder="e.g. Radiator inspection" />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={set('description')} className={input} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Type</label>
              <select value={form.type} onChange={set('type')} className={input}>
                <option value="corrective">Corrective</option>
                <option value="preventive">Preventive</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Priority</label>
              <select value={form.priority} onChange={set('priority')} className={input}>
                {['low', 'medium', 'high', 'critical'].map((p) => (
                  <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Scheduled date</label>
              <input type="date" value={form.scheduledDate} onChange={set('scheduledDate')} className={input} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">SLA (days)</label>
              <input type="number" min="1" value={form.slaDays} onChange={set('slaDays')} className={input} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Assignee</label>
            <select value={form.assignee} onChange={set('assignee')} className={input}>
              <option value="">Unassigned</option>
              {assignees?.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {isSaving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkOrderModal;
