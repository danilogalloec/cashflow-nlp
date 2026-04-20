'use client';

import { useEffect, useState } from 'react';
import { Users, ArrowLeftRight, Wallet, RefreshCw, Target, UserPlus, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { AdminStats } from '@/lib/types';

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

export default function AdminPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.admin.stats(token)
      .then(setStats)
      .catch(e => setError(e instanceof ApiError ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-slate-500" />
    </div>
  );

  if (error) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
        <AlertCircle size={14} />{error}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <ShieldCheck size={18} className="text-primary-light" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Panel de Administrador</h1>
          <p className="text-slate-400 text-sm">Bienvenido, {user?.name}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total usuarios" value={stats!.total_users} icon={Users} color="bg-primary/15 text-primary-light" />
        <StatCard title="Usuarios activos" value={stats!.active_users} icon={ShieldCheck} color="bg-emerald-500/15 text-emerald-400" />
        <StatCard title="Nuevos este mes" value={stats!.new_users_this_month} icon={UserPlus} color="bg-blue-500/15 text-blue-400" />
        <StatCard title="Transacciones" value={stats!.total_transactions} icon={ArrowLeftRight} color="bg-violet-500/15 text-violet-400" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="Cuentas" value={stats!.total_accounts} icon={Wallet} color="bg-amber-500/15 text-amber-400" />
        <StatCard title="Suscripciones activas" value={stats!.total_subscriptions} icon={RefreshCw} color="bg-red-500/15 text-red-400" />
        <StatCard title="Presupuestos activos" value={stats!.total_budgets} icon={Target} color="bg-teal-500/15 text-teal-400" />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/admin/users"
          className="bg-bg-surface border border-bg-border hover:border-primary/30 rounded-2xl p-5 transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <Users size={18} className="text-primary-light" />
            <h3 className="font-semibold text-white">Gestión de usuarios</h3>
          </div>
          <p className="text-sm text-slate-500">Ver, activar/desactivar y administrar todos los usuarios registrados.</p>
          <p className="text-xs text-primary-light mt-3 group-hover:underline">Ver usuarios →</p>
        </Link>

        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h3 className="font-semibold text-white">Estado del sistema</h3>
          </div>
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">API Backend</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />En línea
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Base de datos</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Conectada
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Emails</span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Configura SMTP en .env
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
