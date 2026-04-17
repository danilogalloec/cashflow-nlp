import type { TransactionOut } from '@/lib/types';
import { clsx } from 'clsx';

const DIR_STYLE = {
  income: { dot: 'bg-emerald-400', amount: 'text-emerald-400', sign: '+' },
  expense: { dot: 'bg-red-400', amount: 'text-red-400', sign: '-' },
  transfer: { dot: 'bg-amber-400', amount: 'text-amber-400', sign: '↔' },
};

interface Props {
  transactions: TransactionOut[];
  loading?: boolean;
}

export default function RecentTransactions({ transactions, loading }: Props) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">Últimos Movimientos</h2>

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-bg-elevated animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-bg-elevated rounded animate-pulse w-2/3" />
                <div className="h-2.5 bg-bg-elevated rounded animate-pulse w-1/3" />
              </div>
              <div className="h-4 w-16 bg-bg-elevated rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <p className="text-slate-500 text-sm py-4 text-center">Sin transacciones aún</p>
      )}

      {!loading && transactions.length > 0 && (
        <div className="space-y-1">
          {transactions.map(tx => {
            const s = DIR_STYLE[tx.direction];
            const date = new Date(tx.transaction_date).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
            return (
              <div key={tx.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-bg-elevated transition-colors">
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', s.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{tx.description ?? tx.direction}</p>
                  <p className="text-xs text-slate-500">{date}</p>
                </div>
                <p className={clsx('text-sm font-semibold tabular-nums', s.amount)}>
                  {s.sign}${parseFloat(tx.amount).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
