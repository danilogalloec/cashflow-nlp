'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  BarChart3,
  RefreshCw,
  LogOut,
  ChevronRight,
  Settings,
  User,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Cuentas', icon: Wallet },
  { href: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { href: '/income', label: 'Ingresos', icon: TrendingUp },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/subscriptions', label: 'Suscripciones', icon: RefreshCw },
  { href: '/profile', label: 'Perfil', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-bg-surface border-r border-bg-border flex flex-col">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-bg-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          CF
        </div>
        <span className="font-semibold text-white">CashFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                active
                  ? 'bg-primary/10 text-primary-light border border-primary/20'
                  : 'text-slate-400 hover:text-white hover:bg-bg-elevated',
              )}
            >
              <Icon size={17} className={active ? 'text-primary-light' : 'text-slate-500 group-hover:text-slate-300'} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={13} className="text-primary/50" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-bg-border space-y-0.5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
            pathname === '/settings'
              ? 'bg-primary/10 text-primary-light border border-primary/20'
              : 'text-slate-400 hover:text-white hover:bg-bg-elevated'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-light text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <Settings size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
