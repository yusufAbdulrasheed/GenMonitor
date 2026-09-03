import React, { useState } from 'react';
import { FileText, Download, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const triggerBlobDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const Reports = () => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const download = async ({ path, filename, setBusy }) => {
    setBusy(true);
    try {
      const { data } = await api.get(path, { responseType: 'blob' });
      triggerBlobDownload(data, filename);
    } catch (err) {
      const message =
        err.response?.status === 403
          ? 'Your role does not have access to reports.'
          : 'Failed to download report.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-3 mb-2">
          <FileText className="text-emerald-500 shrink-0" size={32} /> Reports & Analytics
        </h1>
        <p className="text-slate-400 mb-8">Generate and export system health, runtime, and fuel consumption analytics.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all hover:border-slate-700">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-slate-800 rounded-lg text-emerald-500">
                 <AlertCircle size={24} />
               </div>
               <span className="px-2 py-1 text-xs font-medium rounded-md bg-slate-800 text-slate-300">PDF Document</span>
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-2">Fuel & Runtime Summary</h2>
            <p className="text-slate-400 text-sm mb-6">Exports a comprehensive list of all operational units, their total logged runtime hours, and remaining fuel levels.</p>

            <button
              onClick={() => download({ path: '/reports/fuel-runtime', filename: 'fuel-runtime-report.pdf', setBusy: setDownloadingPdf })}
              disabled={downloadingPdf}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                downloadingPdf ? 'bg-slate-800 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Download size={18} />
              {downloadingPdf ? 'Generating...' : 'Download PDF Report'}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all hover:border-slate-700">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-slate-800 rounded-lg text-slate-500">
                 <FileText size={24} />
               </div>
               <span className="px-2 py-1 text-xs font-medium rounded-md bg-slate-800 text-slate-300">CSV Export</span>
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-2">Maintenance History</h2>
            <p className="text-slate-400 text-sm mb-6">Export a spreadsheet of all historical logged maintenance and repair orders across all sites.</p>

            <button
              onClick={() => download({ path: '/reports/maintenance-csv', filename: 'maintenance-history.csv', setBusy: setDownloadingCsv })}
              disabled={downloadingCsv}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                downloadingCsv ? 'bg-slate-800 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Download size={18} />
              {downloadingCsv ? 'Generating...' : 'Download CSV Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
