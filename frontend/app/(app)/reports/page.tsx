'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { DistributionItem, TrendItem, BudgetUsage } from '@/lib/types';
import SpendingPieChart from '@/components/dashboard/SpendingPieChart';

function fmt(value: string) {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function TrendsTable({ trends, loading }: { trends: TrendItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 size={18} className="animate-spin mr-2" />Cargando tendencias…
      </div>
    );
  }
  if (trends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <BarChart3 size={32} className="mb-3 opacity-30" />
        <p className="text-sm">Sin datos suficientes aún</p>
      </div>
    );
  }

  const maxVal = Math.max(...trends.map(t => Math.max(parseFloat(t.income), parseFloat(t.expense))));

  return (
    <div className="space-y-3">
      {[...trends].reverse().map(t => {
        const income = parseFloat(t.income);
        const expense = parseFloat(t.expense);
        const net = parseFloat(t.net);
        const NetIcon = net > 0 ? TrendingUp : net < 0 ? TrendingDown : Minus;
        return (
          <div key={t.period} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">{t.period}</span>
              <div className="flex items-center gap-1.5">
                <NetIcon size={12} className={net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : 'text-slate-500'} />
                <span className={`font-semibold ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {net >= 0 ? '+' : ''}{fmt(t.net)}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-16">Ingresos</span>
                <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: maxVal > 0 ? `${(income / maxVal) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs text-emerald-400 font-mono w-24 text-right">{fmt(t.income)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-16">Gastos</span>
                <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: maxVal > 0 ? `${(expense / maxVal) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs text-red-400 font-mono w-24 text-right">{fmt(t.expense)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage[]>([]);
  const [loadingDist, setLoadingDist] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(6);
  const [dirFilter, setDirFilter] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    if (!token) return;
    setLoadingDist(true);
    api.reports.distribution(token, { direction: dirFilter })
      .then(setDistribution)
      .catch(e => setError(e.message))
      .finally(() => setLoadingDist(false));
  }, [token, dirFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    setLoadingTrends(true);
    api.reports.trends(token, months)
      .then(setTrends)
      .catch(e => setError(e.message))
      .finally(() => setLoadingTrends(false));
  }, [token, months]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    setLoadingBudget(true);
    api.budgets.usage(token)
      .then(setBudgetUsage)
      .catch(() => setBudgetUsage([]))
      .finally(() => setLoadingBudget(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // SpendingPieChart expects CategorySummary format (color passed as extra field)
  const categories = distribution.map(d => ({
    category_id: d.category_id,
    category_name: d.category_name,
    total: d.amount,
    count: d.count,
    color: d.color,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Reportes</h1>
        <p className="text-slate-400 text-sm mt-1">Análisis de tus finanzas personales</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        {/* Distribution */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Distribución por categoría del mes</h2>
            <div className="flex gap-1.5">
              {(['expense', 'income'] as const).map(d => (
                <button key={d} onClick={() => setDirFilter(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    dirFilter === d
                      ? 'bg-primary/15 text-primary-light border border-primary/30'
                      : 'text-slate-400 hover:text-white border border-transparent hover:border-bg-border'
                  }`}>
                  {d === 'expense' ? 'Gastos' : 'Ingresos'}
                </button>
              ))}
            </div>
          </div>
          <SpendingPieChart
            categories={categories}
            loading={loadingDist}
            title={dirFilter === 'expense' ? 'Distribución de Gastos' : 'Distribución de Ingresos'}
            emptyMessage={
              dirFilter === 'income'
                ? 'Sin ingresos registrados este mes.\nRegistra una transacción de tipo "Ingreso" para verlos aquí.'
                : 'Sin gastos registrados este mes.'
            }
          />
        </div>

        {/* Trends */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Balances mensuales</h2>
            <div className="flex gap-1.5">
              {([3, 6, 12] as const).map(m => (
                <button key={m} onClick={() => setMonths(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    months === m
                      ? 'bg-primary/15 text-primary-light border border-primary/30'
                      : 'text-slate-400 hover:text-white border border-transparent hover:border-bg-border'
                  }`}>
                  {m}m
                </button>
              ))}
            </div>
          </div>
          <TrendsTable trends={trends} loading={loadingTrends} />
        </div>

        {/* Distribution detail table */}
        {distribution.length > 0 && (
          <div className="xl:col-span-2 bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-bg-border">
              <h2 className="text-base font-semibold text-white">Detalle de categorías</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3.5 text-left font-medium">Categoría</th>
                  <th className="px-5 py-3.5 text-center font-medium">Transacciones</th>
                  <th className="px-5 py-3.5 text-right font-medium">Porcentaje</th>
                  <th className="px-5 py-3.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {distribution.map((item, i) => (
                  <tr key={item.category_id ?? i} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-white font-medium">{item.category_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-400">{item.count}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                        </div>
                        <span className="text-slate-400 tabular-nums w-12 text-right">{item.percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-white">{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Budget vs Real */}
        <div className="xl:col-span-2 bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
            <Target size={15} className="text-primary-light" />
            <h2 className="text-base font-semibold text-white">Presupuesto vs Real (mes actual)</h2>
          </div>
          {loadingBudget ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 size={18} className="animate-spin mr-2" />Cargando…
            </div>
          ) : budgetUsage.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Target size={32} className="mb-3 opacity-30" />
              <p className="text-sm">Sin presupuestos definidos</p>
              <p className="text-xs mt-1">Crea presupuestos en la sección Presupuestos o al crear una categoría</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {budgetUsage.map(u => {
                const pct = Math.min(u.percentage, 100);
                const over = u.percentage > 100;
                const near = u.percentage >= 80 && u.percentage <= 100;
                const barColor = over ? 'bg-red-500' : near ? 'bg-amber-400' : 'bg-emerald-500';
                const textColor = over ? 'text-red-400' : near ? 'text-amber-400' : 'text-emerald-400';
                return (
                  <div key={u.budget_id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {u.category_color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.category_color }} />
                        )}
                        <span className="text-sm font-medium text-white">{u.name}</span>
                        {u.category_name && u.category_name !== u.name && (
                          <span className="text-xs text-slate-500">{u.category_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400">
                          {fmt(String(u.spent))} <span className="text-slate-600">/ {fmt(String(u.limit))}</span>
                        </span>
                        <span className={`font-bold tabular-nums w-12 text-right ${textColor}`}>
                          {u.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-bg-elevated rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    {over && (
                      <p className="text-xs text-red-400 mt-1">
                        Excedido por {fmt(String(parseFloat(String(u.spent)) - parseFloat(String(u.limit))))}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
