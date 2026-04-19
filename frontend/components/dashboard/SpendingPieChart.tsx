'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CategorySummary } from '@/lib/types';

const FALLBACK_COLORS = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6', '#F97316'];

interface Props {
  categories: CategorySummary[];
  loading?: boolean;
  title?: string;
  emptyMessage?: string;
}

export default function SpendingPieChart({ categories, loading, title = 'Distribución de Gastos', emptyMessage = 'Sin datos este mes' }: Props) {
  const data = categories.map((c, i) => ({
    name: c.category_name,
    value: parseFloat(c.total),
    color: (c as CategorySummary & { color?: string }).color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    count: c.count,
  }));

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">{title}</h2>

      {loading && (
        <div className="h-48 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-sm text-center px-4 gap-1">
          {emptyMessage.split('\n').map((line, i) => (
            <p key={i} className={i === 0 ? 'font-medium' : 'text-xs text-slate-600'}>{line}</p>
          ))}
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
                  background: '#1e1e30',
                  border: '1px solid #4a4a6a',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#e2e8f0',
                }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8', marginBottom: 2 }}
                formatter={(v: number, name: string) =>
                  [`$${v.toFixed(2)}`, name]
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
