import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Server, Plus, Search, Filter, Edit, PowerOff, Power } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import GeneratorModal from '../../components/GeneratorModal';
import { NIGERIA_STATES } from '../../lib/nigeriaStates';
import toast from 'react-hot-toast';

const Generators = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [decommissionedFilter, setDecommissionedFilter] = useState('false');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGen, setEditingGen] = useState(null);

  const { data: sites } = useQuery({
    queryKey: ['sitesList'],
    queryFn: async () => {
      const { data } = await api.get('/sites');
      return data;
    }
  });

  const { data: generatorData, isLoading: loadingGens } = useQuery({
    queryKey: ['generatorsList', page, search, siteFilter, stateFilter, statusFilter, decommissionedFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page,
        limit: 10,
        search,
        siteId: siteFilter,
        state: stateFilter,
        status: statusFilter,
      });
      if (decommissionedFilter) {
        params.append('isDecommissioned', decommissionedFilter);
      }
      const { data } = await api.get(`/generators?${params.toString()}`);
      return data;
    },
    keepPreviousData: true
  });

  const createMutation = useMutation({
    mutationFn: (newGen) => api.post('/generators', newGen),
    onSuccess: () => {
      queryClient.invalidateQueries(['generatorsList']);
      toast.success('Generator created successfully');
      setIsModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error creating generator')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/generators/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['generatorsList']);
      toast.success('Generator updated successfully');
      setIsModalOpen(false);
      setEditingGen(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error updating generator')
  });

  const decommissionMutation = useMutation({
    mutationFn: (id) => api.patch(`/generators/${id}/decommission`),
    onSuccess: () => {
      queryClient.invalidateQueries(['generatorsList']);
      toast.success('Generator status toggled successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error toggling decommission status')
  });

  const handleOpenCreate = () => {
    setEditingGen(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (gen) => {
    setEditingGen(gen);
    setIsModalOpen(true);
  };

  const handleModalSubmit = (formData) => {
    if (editingGen) {
      updateMutation.mutate({ id: editingGen._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Running': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Standby': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Fault': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'UnderMaintenance': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">Generator Assets</h1>
            <p className="text-slate-400">Manage, register, and monitor all generator units.</p>
          </div>
          {user?.role === 'Admin' && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shrink-0"
            >
              <Plus className="w-5 h-5" /> Register Generator
            </button>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID, Make, Model..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-3 md:gap-4">
            <select
              value={siteFilter}
              onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Sites</option>
              {sites?.map(site => (
                <option key={site._id} value={site._id}>{site.name}</option>
              ))}
            </select>
            <select
              value={stateFilter}
              onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All States</option>
              {NIGERIA_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="Running">Running</option>
              <option value="Standby">Standby</option>
              <option value="Fault">Fault</option>
              <option value="UnderMaintenance">UnderMaintenance</option>
            </select>
            <select
              value={decommissionedFilter}
              onChange={(e) => { setDecommissionedFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="false">Active Only</option>
              <option value="true">Decommissioned Only</option>
              <option value="">All Assets</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm text-slate-300">
              <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Generator ID</th>
                  <th className="px-6 py-4">Make & Model</th>
                  <th className="px-6 py-4">Site Code</th>
                  <th className="px-6 py-4">Site</th>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Runtime (hrs)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loadingGens ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-emerald-500 animate-pulse">
                      Loading assets...
                    </td>
                  </tr>
                ) : generatorData?.generators?.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                      No generators found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  generatorData?.generators?.map((gen) => (
                    <tr key={gen._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Server className={`w-5 h-5 ${gen.isDecommissioned ? 'text-slate-600' : 'text-emerald-500'}`} />
                          <div className={gen.isDecommissioned ? 'text-slate-500 line-through' : 'font-medium text-slate-200'}>
                            {gen.generatorId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{gen.make}</div>
                        <div className="text-xs text-slate-500">{gen.model} ({gen.capacityKVA} kVA)</div>
                      </td>
                      <td className="px-6 py-4">{gen.siteCode || 'N/A'}</td>
                      <td className="px-6 py-4">{gen.siteId?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4">{gen.state || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(gen.status)}`}>
                          {gen.isDecommissioned ? 'Decommissioned' : gen.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">{Math.round(gen.runtimeHours ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {(user?.role === 'Admin' || user?.role === 'Engineer') && !gen.isDecommissioned && (
                            <button
                              onClick={() => handleOpenEdit(gen)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {user?.role === 'Admin' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to ${gen.isDecommissioned ? 'reactivate' : 'decommission'} this generator?`)) {
                                  decommissionMutation.mutate(gen._id);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                gen.isDecommissioned 
                                  ? 'text-emerald-500 hover:bg-emerald-500/10' 
                                  : 'text-slate-400 hover:text-rose-400 hover:bg-rose-400/10'
                              }`}
                              title={gen.isDecommissioned ? 'Reactivate' : 'Decommission'}
                            >
                              {gen.isDecommissioned ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {generatorData?.pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Showing page {generatorData.page} of {generatorData.pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page === generatorData.pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <GeneratorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingGen}
        sites={sites}
      />
    </div>
  );
};

export default Generators;
