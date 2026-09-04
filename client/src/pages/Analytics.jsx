import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import api from '../utils/api';
import { num } from '../lib/format';
import TrendChart from '../components/charts/TrendChart';
import StatusDonut from '../components/charts/StatusDonut';

const RANGES = ['24h', '7d', '30d', '90d'];

const Kpi = ({ label, value, sub }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-bold text-slate-100">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

const Analytics = () => {
  const [range, setRange] = useState('7d');
  const [genId, setGenId] = useState('');
  const [metric, setMetric] = useState('fuelLevel');

  const { data: summary } = useQuery({
    queryKey: ['analyticsSummary', range],
    queryFn: async () => (await api.get(`/analytics/summary?range=${range}`)).data,
    refetchInterval: 30000,
  });

  const { data: generators = [] } = useQuery({
    queryKey: ['generatorOptions'],
    queryFn: async () => (await api.get('/generators?limit=200')).data.generators,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['genHistory', genId, range],
    queryFn: async () => (await api.get(`/generators/${genId}/history?range=${range}`)).data,
    enabled: !!genId,
  });

  const selectedGen = generators.find((g) => g._id === genId);
  const tankSize = selectedGen?.fuelTankSize;

  const metricMeta = {
    fuelLevel: { color: '#bf4a1f', unit: ' L', domain: [0, tankSize || 'auto'] },
    temperature: { color: '#96691a', unit: '°C' },
    batteryVoltage: { color: '#386690', unit: 'V' },
    runtimeHours: { color: '#3c7853', unit: 'h' },
  }[metric];

  // Readings store fuelLevel as a % of capacity — convert the series to litres.
  const chartData =
    metric === 'fuelLevel' && tankSize
      ? history.map((r) => ({
          ...r,
          fuelLevel:
            typeof r.fuelLevel === 'number' ? Math.round((r.fuelLevel / 100) * tankSize) : r.fuelLevel,
        }))
      : history;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-3">
              <BarChart3 className="text-emerald-500 shrink-0" size={30} /> Analytics
            </h1>
            <p className="text-slate-400 mt-1">Fleet reliability, availability and consumption trends.</p>
          </div>
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 self-start sm:self-auto">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-sm ${
                  range === r ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Kpi label="Availability" value={`${num(summary?.availabilityPct)}%`} />
          <Kpi label="MTBF" value={summary?.reliability?.mtbfHours != null ? `${num(summary.reliability.mtbfHours, 0)}h` : '—'} sub={`${summary?.reliability?.faultsInRange ?? 0} faults`} />
          <Kpi label="MTTR" value={summary?.reliability?.mttrHours != null ? `${num(summary.reliability.mttrHours)}h` : '—'} />
          <Kpi label="Open alerts" value={summary?.alertsOpen?.total ?? '—'} sub={`${summary?.alertsOpen?.critical ?? 0} critical`} />
          <Kpi label="Work orders" value={summary?.workOrders?.open ?? '—'} sub={`${summary?.workOrders?.overdue ?? 0} overdue`} />
          <Kpi label="Fuel burn" value={summary?.fuelBurnLitresPerHour != null ? `${num(summary.fuelBurnLitresPerHour)} L/h` : '—'} />

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Fleet status</h3>
            <StatusDonut byStatus={summary?.generators?.byStatus || {}} />
          </div>
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Generator trend</h3>
              <div className="flex flex-wrap gap-2">
                <select
                  value={genId}
                  onChange={(e) => setGenId(e.target.value)}
                  className="flex-1 sm:flex-none bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-200"
                >
                  <option value="">Pick a generator…</option>
                  {generators.map((g) => (
                    <option key={g._id} value={g._id}>{g.generatorId}</option>
                  ))}
                </select>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-200"
                >
                  <option value="fuelLevel">Fuel (L)</option>
                  <option value="temperature">Temperature</option>
                  <option value="batteryVoltage">Battery V</option>
                  <option value="runtimeHours">Runtime h</option>
                </select>
              </div>
            </div>
            {genId ? (
              history.length > 0 ? (
                <TrendChart data={chartData} dataKey={metric} {...metricMeta} />
              ) : (
                <p className="text-slate-500 text-sm py-16 text-center">No readings in this window.</p>
              )
            ) : (
              <p className="text-slate-500 text-sm py-16 text-center">Select a generator to see its history.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
