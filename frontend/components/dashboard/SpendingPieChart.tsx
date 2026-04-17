'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CategorySummary } from '@/lib/types';

const FALLBACK_COLORS = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

interface Props {
  categories: CategorySummary[];
  loading?: boolean;
}

export default function SpendingPieChart({ categories, loading }: Props) {
  const data = categories.map((c, i) => ({
    name: c.category_name,
    value: parseFloat(c.total),
    color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    count: c.count,
  }));

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">Distribución de Gastos</h2>

      {loading && (
        <div className="h-48 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
          Sin datos este mes
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="40%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#18182A',
                  border: '1px solid #252540',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) =>
                  [`$${v.toFixed(2)}`, '']
                }
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
