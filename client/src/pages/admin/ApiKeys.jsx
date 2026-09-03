import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, Copy, Ban, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { timeAgo } from '../../lib/format';

const ApiKeys = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', scope: 'fleet', generatorId: '' });
  const [freshKey, setFreshKey] = useState(null);

  const { data: keys = [] } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => (await api.get('/api-keys')).data,
  });
  const { data: generators = [] } = useQuery({
    queryKey: ['generatorOptions'],
    queryFn: async () => (await api.get('/generators?limit=200')).data.generators,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['apiKeys'] });

  const createMut = useMutation({
    mutationFn: (body) => api.post('/api-keys', body),
    onSuccess: ({ data }) => {
      setFreshKey(data.key);
      setForm({ name: '', scope: 'fleet', generatorId: '' });
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const revokeMut = useMutation({ mutationFn: (id) => api.patch(`/api-keys/${id}/revoke`), onSuccess: invalidate });
  const delMut = useMutation({ mutationFn: (id) => api.delete(`/api-keys/${id}`), onSuccess: invalidate });

  return (
    <div className="flex-1 p-8 overflow-auto bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3 mb-2">
          <KeyRound className="text-cyan-400" size={30} /> Device API Keys
        </h1>
        <p className="text-slate-400 mb-6">
          Authenticate real controllers / IoT gateways posting to <code className="text-cyan-400">POST /api/ingest/readings</code>.
        </p>

        {freshKey && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
            <p className="text-sm text-emerald-300 font-medium mb-2">New key — copy it now, it won't be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-950 rounded px-3 py-2 text-sm text-slate-200 break-all">{freshKey}</code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(freshKey);
                  toast.success('Copied');
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate({
              name: form.name,
              scope: form.scope,
              generatorId: form.scope === 'generator' ? form.generatorId : undefined,
            });
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Site A gateway"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Scope</label>
            <select
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="fleet">Whole fleet</option>
              <option value="generator">Single generator</option>
            </select>
          </div>
          {form.scope === 'generator' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Generator</label>
              <select
                required
                value={form.generatorId}
                onChange={(e) => setForm((f) => ({ ...f, generatorId: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">Select…</option>
                {generators.map((g) => (
                  <option key={g._id} value={g._id}>{g.generatorId}</option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Plus size={16} /> Create key
          </button>
        </form>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Prefix</th>
                <th className="px-5 py-3">Scope</th>
                <th className="px-5 py-3">Last used</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {keys.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No API keys.</td></tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-slate-200">{k.name}</td>
                    <td className="px-5 py-3 font-mono text-xs">{k.prefix}…</td>
                    <td className="px-5 py-3">{k.scope === 'generator' ? k.generator?.generatorId || 'generator' : 'fleet'}</td>
                    <td className="px-5 py-3 text-slate-400">{k.lastUsedAt ? timeAgo(k.lastUsedAt) : 'never'}</td>
                    <td className="px-5 py-3">
                      <span className={k.isActive ? 'text-emerald-400 text-xs' : 'text-slate-500 text-xs'}>
                        {k.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {k.isActive && (
                          <button onClick={() => revokeMut.mutate(k.id)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg" title="Revoke">
                            <Ban size={14} />
                          </button>
                        )}
                        <button onClick={() => window.confirm('Delete this key?') && delMut.mutate(k.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApiKeys;
