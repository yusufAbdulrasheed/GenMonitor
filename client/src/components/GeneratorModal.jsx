import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { NIGERIA_STATES } from '../lib/nigeriaStates';

const EMPTY = {
  generatorId: '',
  make: '',
  model: '',
  capacityKVA: '',
  fuelTankSize: '',
  site: '', // free text — an existing site name/code, or a new one to create
  state: '',
  installationDate: '',
};

const GeneratorModal = ({ isOpen, onClose, onSubmit, initialData, sites }) => {
  const [formData, setFormData] = useState(EMPTY);

  useEffect(() => {
    if (initialData) {
      setFormData({
        generatorId: initialData.generatorId || '',
        make: initialData.make || '',
        model: initialData.model || '',
        capacityKVA: initialData.capacityKVA || '',
        fuelTankSize: initialData.fuelTankSize || '',
        site: initialData.siteId?.name || initialData.siteCode || '',
        state: initialData.state || '',
        installationDate: initialData.installationDate
          ? new Date(initialData.installationDate).toISOString().split('T')[0]
          : '',
      });
    } else {
      setFormData(EMPTY);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-100 mb-6 pr-8">
          {initialData ? 'Edit Generator Asset' : 'Register Generator Asset'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Generator ID</label>
              <input
                type="text"
                name="generatorId"
                required
                value={formData.generatorId}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="e.g. GEN-1001-A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Assigned Site</label>
              <input
                type="text"
                name="site"
                required
                list="site-options"
                value={formData.site}
                onChange={handleChange}
                autoComplete="off"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="Type or pick a site"
              />
              <datalist id="site-options">
                {sites?.map((site) => (
                  <option key={site._id} value={site.name} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-slate-500">Pick an existing site or type a new one to create it.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Make</label>
              <input
                type="text"
                name="make"
                required
                value={formData.make}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Cummins"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
              <input
                type="text"
                name="model"
                required
                value={formData.model}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="e.g. C150D5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Capacity (kVA)</label>
              <input
                type="number"
                name="capacityKVA"
                required
                value={formData.capacityKVA}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Fuel Tank Size (L)</label>
              <input
                type="number"
                name="fuelTankSize"
                required
                value={formData.fuelTankSize}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder="500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">State</label>
              <select
                name="state"
                required
                value={formData.state}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select a state</option>
                {NIGERIA_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Installation Date</label>
              <input
                type="date"
                name="installationDate"
                required
                value={formData.installationDate}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {initialData ? 'Save Changes' : 'Register Generator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneratorModal;
