import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const AXIS = '#8c8578';
const GRID = '#e7e3d8';

const TrendChart = ({ data, dataKey, color = '#bf4a1f', unit = '', height = 220, domain }) => {
  const rows = (data || []).map((r) => ({
    t: new Date(r.timestamp).getTime(),
    [dataKey]: r[dataKey],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tick={{ fill: AXIS, fontSize: 11 }}
          stroke={AXIS}
          tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} domain={domain || ['auto', 'auto']} width={44} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #d7d1c2', borderRadius: 4, fontSize: 12, color: '#1e1c17' }}
          labelStyle={{ color: '#8c8578' }}
          labelFormatter={(v) => new Date(v).toLocaleString()}
          formatter={(val) => [`${typeof val === 'number' ? val.toFixed(1) : val}${unit}`, dataKey]}
        />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TrendChart;
