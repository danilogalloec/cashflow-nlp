import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'income' | 'expense' | 'primary';
  loading?: boolean;
}

const VARIANTS = {
  default: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  income: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  expense: 'text-red-400 bg-red-500/10 border-red-500/20',
  primary: 'text-primary-light bg-primary/10 border-primary/20',
};

export default function StatCard({ title, value, subtitle, icon: Icon, variant = 'default', loading }: StatCardProps) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 flex items-start gap-4 hover:border-bg-elevated transition-colors">
      <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0', VARIANTS[variant])}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="h-7 w-28 bg-bg-elevated rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-white leading-none">{value}</p>
        )}
        {subtitle && !loading && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
