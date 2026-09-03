import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const empty = {
  generatorId: '',
  name: '',
  intervalType: 'runtimeHours',
  intervalValue: 250,
  checklistText: '',
  priority: 'medium',
  leadTimeDays: 3,
  slaDays: 7,
  isActive: true,
};

const MaintenancePlanModal = ({ isOpen, plan, generators, onClose, onSubmit, isSaving }) => {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!isOpen) return;
    if (plan) {
      setForm({
        generatorId: plan.generatorId?._id || plan.generatorId || '',
        name: plan.name || '',
        intervalType: plan.intervalType || 'runtimeHours',
        intervalValue: plan.intervalValue || 250,
        checklistText: (plan.checklist || []).join('\n'),
        priority: plan.priority || 'medium',
        leadTimeDays: plan.leadTimeDays ?? 3,
        slaDays: plan.slaDays ?? 7,
        isActive: plan.isActive !== false,
      });
    } else {
      setForm(empty);
    }
  }, [isOpen, plan]);

  if (!isOpen) return null;

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const input =
    'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={18} />
        </button>
        <h2 className="text-xl font-bold text-slate-100 mb-6">{plan ? 'Edit Plan' : 'New Maintenance Plan'}</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              generatorId: form.generatorId,
              name: form.name,
              intervalType: form.intervalType,
              intervalValue: Number(form.intervalValue),
              priority: form.priority,
              leadTimeDays: Number(form.leadTimeDays),
              slaDays: Number(form.slaDays),
              isActive: form.isActive,
              checklist: form.checklistText.split('\n').map((s) => s.trim()).filter(Boolean),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-slate-300 mb-1">Generator</label>
            <select required disabled={!!plan} value={form.generatorId} onChange={set('generatorId')} className={`${input} disabled:opacity-60`}>
              <option value="">Select…</option>
              {generators?.map((g) => (
                <option key={g._id} value={g._id}>{g.generatorId} — {g.siteCode || 'Unassigned'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Plan name</label>
            <input required value={form.name} onChange={set('name')} className={input} placeholder="e.g. 250-hour service" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Interval type</label>
              <select value={form.intervalType} onChange={set('intervalType')} className={input}>
                <option value="runtimeHours">Runtime hours</option>
                <option value="days">Calendar days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Every</label>
              <input type="number" min="1" value={form.intervalValue} onChange={set('intervalValue')} className={input} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Priority</label>
              <select value={form.priority} onChange={set('priority')} className={input}>
                {['low', 'medium', 'high'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Lead (days)</label>
              <input type="number" min="0" value={form.leadTimeDays} onChange={set('leadTimeDays')} className={input} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">SLA (days)</label>
              <input type="number" min="1" value={form.slaDays} onChange={set('slaDays')} className={input} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Checklist (one item per line)</label>
            <textarea rows={4} value={form.checklistText} onChange={set('checklistText')} className={input} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Active
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {isSaving ? 'Saving…' : 'Save Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenancePlanModal;
