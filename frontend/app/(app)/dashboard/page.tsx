'use client';

import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Activity, Bell, Target, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { DashboardOut, SubscriptionOut, BudgetUsage } from '@/lib/types';
import StatCard from '@/components/dashboard/StatCard';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import SpendingPieChart from '@/components/dashboard/SpendingPieChart';
import NLPChat from '@/components/chat/NLPChat';
import Link from 'next/link';

function fmt(value: string, currency = 'USD') {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function progressColor(pct: number) {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-400';
  return 'bg-emerald-500';
}

// ── Upcoming Subscriptions Widget ─────────────────────────────────────────────
function UpcomingSubscriptions({ subs }: { subs: SubscriptionOut[] }) {
  if (subs.length === 0) return null;

  return (
    <div className="bg-bg-surface border border-amber-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={15} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Próximos cobros (7 días)</h3>
        <span className="ml-auto px-2 py-0.5 bg-amber-500/15 text-amber-300 text-xs font-medium rounded-full">
          {subs.length}
        </span>
      </div>
      <div className="space-y-2">
        {subs.map(sub => {
          const days = sub.next_due ? daysUntil(sub.next_due) : null;
          return (
            <div key={sub.id} className="flex items-center justify-between py-2 border-b border-bg-border last:border-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar size={12} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{sub.name}</p>
                  <p className="text-xs text-slate-500">
                    {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-semibold text-red-400">
                {fmt(sub.amount, sub.currency)}
              </span>
            </div>
          );
        })}
      </div>
      <Link href="/subscriptions" className="mt-3 block text-xs text-center text-slate-500 hover:text-primary-light transition-colors">
        Ver todas las suscripciones →
      </Link>
    </div>
  );
}

// ── Budget Summary Widget ──────────────────────────────────────────────────────
function BudgetSummary({ usage }: { usage: BudgetUsage[] }) {
  if (usage.length === 0) return null;

  const alerts = usage.filter(u => u.percentage >= 80);
  if (alerts.length === 0) return null;

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target size={15} className="text-primary-light" />
        <h3 className="text-sm font-semibold text-white">Presupuestos en alerta</h3>
        <Link href="/budgets" className="ml-auto text-xs text-slate-500 hover:text-primary-light transition-colors">
          Ver todos →
        </Link>
      </div>
      <div className="space-y-3">
        {alerts.map(u => (
          <div key={u.budget_id}>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5">
                {u.category_color && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.category_color }} />
                )}
                <span className="text-slate-300 font-medium">{u.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {u.percentage >= 100 && <AlertCircle size={10} className="text-red-400" />}
                <span className={`font-semibold ${u.percentage >= 100 ? 'text-red-400' : 'text-amber-400'}`}>
                  {u.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor(u.percentage)}`}
                style={{ width: `${Math.min(u.percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-0.5">
              <span>{fmt(u.spent)} gastado</span>
              <span>límite {fmt(u.limit)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardOut | null>(null);
  const [upcoming, setUpcoming] = useState<SubscriptionOut[]>([]);
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.dashboard.get(token),
      api.subscriptions.upcoming(token, 7).catch(() => [] as SubscriptionOut[]),
      api.budgets.usage(token).catch(() => [] as BudgetUsage[]),
    ])
      .then(([d, up, bu]) => { setData(d); setUpcoming(up); setBudgetUsage(bu); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchDashboard, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const net = data ? parseFloat(data.current_month.net) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen financiero del mes actual</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && data && data.accounts.length === 0 && (
        <div className="mb-8 flex items-center gap-4 px-5 py-4 bg-primary/10 border border-primary/25 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Wallet size={18} className="text-primary-light" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Crea tu primera cuenta</p>
            <p className="text-xs text-slate-400 mt-0.5">Sin una cuenta las demás secciones no funcionan. Agrega efectivo, banco o tarjeta.</p>
          </div>
          <Link
            href="/accounts"
            className="flex-shrink-0 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Crear cuenta →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Balance Total"
          value={data ? fmt(data.total_balance) : '—'}
          icon={Wallet}
          variant="primary"
          loading={loading}
        />
        <StatCard
          title="Ingresos del Mes"
          value={data ? fmt(data.current_month.income) : '—'}
          icon={TrendingUp}
          variant="income"
          loading={loading}
        />
        <StatCard
          title="Gastos del Mes"
          value={data ? fmt(data.current_month.expense) : '—'}
          icon={TrendingDown}
          variant="expense"
          loading={loading}
        />
        <StatCard
          title="Flujo Neto"
          value={data ? fmt(data.current_month.net) : '—'}
          subtitle={net >= 0 ? 'Superávit' : 'Déficit'}
          icon={Activity}
          variant={net >= 0 ? 'income' : 'expense'}
          loading={loading}
        />
      </div>

      {/* Main grid */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Left: charts + transactions */}
        <div className="xl:col-span-2 space-y-6">
          <SpendingPieChart categories={data?.top_categories ?? []} loading={loading} />
          <RecentTransactions transactions={data?.recent_transactions ?? []} loading={loading} />
        </div>

        {/* Right: alerts + NLP chat */}
        <div className="xl:col-span-1 space-y-6">
          {!loading && <UpcomingSubscriptions subs={upcoming} />}
          {!loading && <BudgetSummary usage={budgetUsage} />}
          <NLPChat onTransactionCreated={fetchDashboard} />
        </div>
      </div>
    </div>
  );
}
