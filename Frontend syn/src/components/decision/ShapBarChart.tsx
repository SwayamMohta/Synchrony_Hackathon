/**
 * ShapBarChart.tsx
 * Horizontal Recharts bar chart for shap_top_features.
 * Sorted by absolute value descending. Positive = risk-increasing (red), negative = risk-reducing (green).
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ShapBarChartProps {
  shapFeatures: Record<string, number>;
}

export const ShapBarChart: React.FC<ShapBarChartProps> = ({ shapFeatures }) => {
  const data = Object.entries(shapFeatures)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 10); // top 10

  if (data.length === 0) {
    return (
      <p style={{ fontSize: 12, color: '#667085', padding: '12px 0' }}>
        No SHAP feature data available.
      </p>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number } }[] }) => {
    if (!active || !payload || !payload.length) return null;
    const { name, value } = payload[0].payload;
    return (
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 11,
        color: '#f1f5f9',
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
        <div style={{ color: value >= 0 ? '#f87171' : '#34d399' }}>
          SHAP: {value >= 0 ? '+' : ''}{value.toFixed(4)}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
          tickFormatter={v => v.toFixed(2)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          tick={{ fontSize: 11, fill: '#4b5563', fontFamily: "'IBM Plex Sans', 'Inter', sans-serif" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
        <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.value >= 0 ? '#ef4444' : '#10b981'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
