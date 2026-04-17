'use client';

import { useEffect, useState } from 'react';
import {
  Plus, ArrowLeftRight, TrendingUp, TrendingDown, Repeat2,
  Loader2, AlertCircle, X, CheckCircle, Filter, Pencil, Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { AccountOut, TransactionOut, TransactionCreate, TransactionDirection, CurrencyCode } from '@/lib/types';

const DIR_LABELS: Record<TransactionDirection, string> = {
  income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia',
};

const DIR_STYLES: Record<TransactionDirection, string> = {
  income: 'bg-emerald-500/15 text-emerald-300',
  expense: 'bg-red-500/15 text-red-300',
  transfer: 'bg-blue-500/15 text-blue-300',
};

const DIR_ICON: Record<TransactionDirection, React.ElementType> = {
  income: TrendingUp, expense: TrendingDown, transfer: Repeat2,
};

function fmt(value: string, currency = 'USD') {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

function CreateModal({
  accounts, onClose, onCreated,
}: {
  accounts: AccountOut[];
  onClose: () => void;
  onCreated: (t: TransactionOut) => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<TransactionCreate>({
    account_id: accounts[0]?.id ?? '',
    direction: 'expense',
    amount: '',
    currency: 'USD',
    description: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const tx = await api.transactions.create(token, form);
      onCreated(tx);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al crear la transacción');
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nueva transacción</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
            <AlertCircle size={14} />{error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['income', 'expense', 'transfer'] as TransactionDirection[]).map(d => (
              <button key={d} type="button"
                onClick={() => setForm(f => ({ ...f, direction: d }))}
                className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                  form.direction === d
                    ? 'bg-primary/15 border-primary/40 text-primary-light'
                    : 'border-bg-border text-slate-400 hover:border-slate-500 hover:text-white'
                }`}>
                {DIR_LABELS[d]}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Cuenta</label>
            <select className={field} value={form.account_id}
              onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
              {accounts.filter(a => a.is_active).map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Monto</label>
              <input className={field} type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Moneda</label>
              <select className={field} value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value as CurrencyCode }))}>
                {(['USD', 'GTQ', 'EUR', 'MXN'] as CurrencyCode[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Descripción</label>
            <input className={field} placeholder="¿En qué gastaste?" value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha</label>
            <input className={field} type="date" value={form.transaction_date ?? ''}
              onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.amount || !form.account_id}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({
  tx, onClose, onUpdated,
}: { tx: TransactionOut; onClose: () => void; onUpdated: (t: TransactionOut) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    description: tx.description ?? '',
    transaction_date: tx.transaction_date,
    subscription_id: tx.subscription_id ?? '',
  });
  const [subs, setSubs] = useState<import('@/lib/types').SubscriptionOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.subscriptions.list(token).then(setSubs).catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const updated = await api.transactions.update(token, tx.id, {
        description: form.description || undefined,
        transaction_date: form.transaction_date,
        subscription_id: form.subscription_id || undefined,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Editar transacción</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Read-only summary */}
        <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-bg-elevated rounded-xl">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${DIR_STYLES[tx.direction]}`}>
            {DIR_LABELS[tx.direction]}
          </span>
          <span className="font-mono font-semibold text-white text-sm">{fmt(tx.amount, tx.currency)}</span>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
            <AlertCircle size={14} />{error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Descripción</label>
            <input className={field} placeholder="¿En qué gastaste?" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha</label>
            <input className={field} type="date" value={form.transaction_date}
              onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} required />
          </div>
          {tx.direction === 'expense' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Pago recurrente <span className="text-slate-600">(opcional)</span>
              </label>
              <select className={field} value={form.subscription_id}
                onChange={e => setForm(f => ({ ...f, subscription_id: e.target.value }))}>
                <option value="">— Sin vincular —</option>
                {subs.filter(s => s.is_active).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({fmt(s.amount, s.currency)}/{s.frequency === 'monthly' ? 'mes' : s.frequency})
                  </option>
                ))}
              </select>
              {form.subscription_id && (
                <p className="text-xs text-emerald-400 mt-1.5">
                  ✓ Vinculada a suscripción
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({
  tx, onClose, onDeleted,
}: { tx: TransactionOut; onClose: () => void; onDeleted: (id: string) => void }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await api.transactions.remove(token, tx.id);
      onDeleted(tx.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold text-white mb-2">¿Eliminar transacción?</h2>
        <p className="text-sm text-slate-400 mb-1">
          <span className="text-white font-medium">{tx.description ?? 'Sin descripción'}</span>
          {' — '}
          <span className={tx.direction === 'income' ? 'text-emerald-400' : 'text-red-400'}>
            {fmt(tx.amount, tx.currency)}
          </span>
        </p>
        <p className="text-xs text-slate-500 mb-5">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={confirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TransactionOut | null>(null);
  const [deleting, setDeleting] = useState<TransactionOut | null>(null);
  const [dirFilter, setDirFilter] = useState<TransactionDirection | ''>('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.transactions.list(token, dirFilter ? { direction: dirFilter } : undefined),
      api.accounts.list(token),
    ])
      .then(([txs, accs]) => { setTransactions(txs); setAccounts(accs); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, dirFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const accountName = (id: string) => accounts.find(a => a.id === id)?.name ?? '—';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transacciones</h1>
          <p className="text-slate-400 text-sm mt-1">{transactions.length} registros</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} />Nueva transacción
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        <Filter size={14} className="text-slate-500" />
        {(['', 'income', 'expense', 'transfer'] as const).map(d => (
          <button key={d} onClick={() => setDirFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              dirFilter === d
                ? 'bg-primary/15 text-primary-light border border-primary/30'
                : 'text-slate-400 hover:text-white border border-transparent hover:border-bg-border'
            }`}>
            {d === '' ? 'Todos' : DIR_LABELS[d]}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />Cargando transacciones…
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ArrowLeftRight size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Sin transacciones</p>
            <p className="text-sm mt-1">Registra tu primera transacción</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3.5 text-left font-medium">Fecha</th>
                <th className="px-5 py-3.5 text-left font-medium">Descripción</th>
                <th className="px-5 py-3.5 text-left font-medium">Tipo</th>
                <th className="px-5 py-3.5 text-left font-medium">Cuenta</th>
                <th className="px-5 py-3.5 text-right font-medium">Monto</th>
                <th className="px-5 py-3.5 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {transactions.map(tx => {
                const Icon = DIR_ICON[tx.direction];
                return (
                  <tr key={tx.id} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(tx.transaction_date).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-white max-w-xs truncate">
                      {tx.description ?? <span className="text-slate-600 italic">Sin descripción</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${DIR_STYLES[tx.direction]}`}>
                        <Icon size={11} />{DIR_LABELS[tx.direction]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{accountName(tx.account_id)}</td>
                    <td className={`px-5 py-4 text-right font-mono font-semibold ${
                      tx.direction === 'income' ? 'text-emerald-400' : tx.direction === 'expense' ? 'text-red-400' : 'text-white'
                    }`}>
                      {tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '-' : ''}
                      {fmt(tx.amount, tx.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditing(tx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-light hover:bg-primary/10 transition-colors"
                          title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleting(tx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && accounts.length > 0 && (
        <CreateModal
          accounts={accounts}
          onClose={() => setShowCreate(false)}
          onCreated={tx => { setTransactions(prev => [tx, ...prev]); setShowCreate(false); }}
        />
      )}
      {editing && (
        <EditModal
          tx={editing}
          onClose={() => setEditing(null)}
          onUpdated={updated => {
            setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <DeleteConfirm
          tx={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={id => {
            setTransactions(prev => prev.filter(t => t.id !== id));
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
