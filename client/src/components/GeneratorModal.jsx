import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const GeneratorModal = ({ isOpen, onClose, onSubmit, initialData, sites }) => {
  const [formData, setFormData] = useState({
    generatorId: '',
    make: '',
    model: '',
    capacityKVA: '',
    fuelTankSize: '',
    siteId: '',
    siteCode: '', // Added siteCode
    installationDate: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        generatorId: initialData.generatorId || '',
        make: initialData.make || '',
        model: initialData.model || '',
        capacityKVA: initialData.capacityKVA || '',
        fuelTankSize: initialData.fuelTankSize || '',
        siteId: initialData.siteId?._id || initialData.siteId || '',
        siteCode: initialData.siteCode || '', // Added siteCode
        installationDate: initialData.installationDate ? new Date(initialData.installationDate).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        generatorId: '',
        make: '',
        model: '',
        capacityKVA: '',
        fuelTankSize: '',
        siteId: '',
        siteCode: '', // Added siteCode
        installationDate: ''
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (formData.siteId && sites?.length) {
      const selectedSite = sites.find(site => site._id === formData.siteId);
      if (selectedSite && selectedSite.siteCode !== formData.siteCode) {
        setFormData(prev => ({ ...prev, siteCode: selectedSite.siteCode }));
      }
    } else if (!formData.siteId && formData.siteCode) {
      // Clear siteCode if no site is selected
      setFormData(prev => ({ ...prev, siteCode: '' }));
    }
  }, [formData.siteId, formData.siteCode, sites]);

  // When editing, initialData may carry only a siteCode (no populated siteId);
  // derive the siteId from the loaded sites list so the <select> shows it.
  useEffect(() => {
    if (initialData?.siteCode && !formData.siteId && sites?.length) {
      const siteByCode = sites.find(site => site.siteCode === initialData.siteCode);
      if (siteByCode) {
        setFormData(prev => ({ ...prev, siteId: siteByCode._id, siteCode: siteByCode.siteCode }));
      }
    }
  }, [initialData, sites, formData.siteId]);


  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-100 mb-6">
          {initialData ? 'Edit Generator Asset' : 'Register Generator Asset'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <select
                name="siteId"
                required
                value={formData.siteId}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select a site</option>
                {sites?.map(site => (
                  <option key={site._id} value={site._id}>{site.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
