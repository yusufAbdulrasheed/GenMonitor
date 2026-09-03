import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = {
  Running: '#3c7853',
  Standby: '#386690',
  Fault: '#a2382f',
  UnderMaintenance: '#96691a',
  Decommissioned: '#b4ad9c',
};

const StatusDonut = ({ byStatus = {}, height = 240 }) => {
  const data = Object.entries(byStatus)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (data.length === 0) return <p className="text-slate-500 text-sm">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name] || '#b4ad9c'} stroke="#ffffff" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #d7d1c2', borderRadius: 4, fontSize: 12, color: '#1e1c17' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#6f6959' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StatusDonut;
