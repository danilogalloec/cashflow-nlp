'use client';

import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { DashboardOut } from '@/lib/types';
import StatCard from '@/components/dashboard/StatCard';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import SpendingPieChart from '@/components/dashboard/SpendingPieChart';
import NLPChat from '@/components/chat/NLPChat';

function fmt(value: string, currency = 'USD') {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = () => {
    if (!token) return;
    setLoading(true);
    api.dashboard.get(token)
      .then(setData)
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
        {/* Left: recent transactions + pie */}
        <div className="xl:col-span-2 space-y-6">
          <SpendingPieChart categories={data?.top_categories ?? []} loading={loading} />
          <RecentTransactions transactions={data?.recent_transactions ?? []} loading={loading} />
        </div>

        {/* Right: NLP chat */}
        <div className="xl:col-span-1">
          <NLPChat onTransactionCreated={fetchDashboard} />
        </div>
      </div>
    </div>
  );
}
