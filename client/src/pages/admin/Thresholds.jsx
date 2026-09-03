import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const FIELDS = [
  ['lowFuelPct', 'Low fuel %'],
  ['criticalFuelPct', 'Critical fuel %'],
  ['lowBatteryV', 'Low battery V'],
  ['criticalBatteryV', 'Critical battery V'],
  ['highTempC', 'High temp °C'],
  ['criticalTempC', 'Critical temp °C'],
];

const Thresholds = () => {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState('global');
  const [siteId, setSiteId] = useState('');
  const [generatorId, setGeneratorId] = useState('');
  const [values, setValues] = useState({});

  const { data } = useQuery({
    queryKey: ['thresholds'],
    queryFn: async () => (await api.get('/thresholds')).data,
  });
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => (await api.get('/sites')).data,
  });
  const { data: generators = [] } = useQuery({
    queryKey: ['generatorOptions'],
    queryFn: async () => (await api.get('/generators?limit=200')).data.generators,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['thresholds'] });

  const saveMut = useMutation({
    mutationFn: (body) => api.put('/thresholds', body),
    onSuccess: () => {
      toast.success('Thresholds saved');
      setValues({});
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Save failed'),
  });
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/thresholds/${id}`),
    onSuccess: () => {
      toast.success('Override removed');
      invalidate();
    },
  });

  const defaults = data?.defaults || {};
  const configs = data?.configs || [];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-3 mb-2">
          <SlidersHorizontal className="text-cyan-400 shrink-0" size={30} /> Alert Thresholds
        </h1>
        <p className="text-slate-400 mb-6">
          Resolution order at evaluation time: <span className="text-slate-300">generator → site → global → built-in defaults</span>.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Add / update override</h3>
          <div className="flex flex-wrap gap-3 mb-4">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full sm:w-auto bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
              <option value="global">Global</option>
              <option value="site">Site</option>
              <option value="generator">Generator</option>
            </select>
            {scope === 'site' && (
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full sm:w-auto bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
                <option value="">Select site…</option>
                {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            )}
            {scope === 'generator' && (
              <select value={generatorId} onChange={(e) => setGeneratorId(e.target.value)} className="w-full sm:w-auto bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
                <option value="">Select generator…</option>
                {generators.map((g) => <option key={g._id} value={g._id}>{g.generatorId}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {FIELDS.map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={`${defaults[key] ?? ''}`}
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() =>
              saveMut.mutate({
                scope,
                siteId: scope === 'site' ? siteId : undefined,
                generatorId: scope === 'generator' ? generatorId : undefined,
                ...values,
              })
            }
            disabled={saveMut.isPending || (scope === 'site' && !siteId) || (scope === 'generator' && !generatorId)}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Save override
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
         <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Scope</th>
                {FIELDS.map(([k, l]) => <th key={k} className="px-3 py-3 text-xs">{l}</th>)}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className="text-slate-400">
                <td className="px-4 py-3 italic">defaults</td>
                {FIELDS.map(([k]) => <td key={k} className="px-3 py-3">{defaults[k] ?? '—'}</td>)}
                <td />
              </tr>
              {configs.map((c) => (
                <tr key={c._id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    {c.scope}
                    {c.siteId && <span className="block text-xs text-slate-500">{c.siteId.name}</span>}
                    {c.generatorId && <span className="block text-xs text-slate-500">{c.generatorId.generatorId}</span>}
                  </td>
                  {FIELDS.map(([k]) => <td key={k} className="px-3 py-3">{c[k] ?? '—'}</td>)}
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => delMut.mutate(c._id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
         </div>
        </div>
      </div>
    </div>
  );
};

export default Thresholds;
