'use client';

import { useEffect, useState } from 'react';
import { Plus, Wallet, ToggleLeft, ToggleRight, Loader2, AlertCircle, X, CheckCircle, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { AccountOut, AccountCreate, AccountUpdate, AccountType, CurrencyCode } from '@/lib/types';

const TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo', bank: 'Banco', digital: 'Digital',
  investment: 'Inversión', credit: 'Crédito',
};

const TYPE_COLORS: Record<AccountType, string> = {
  cash: 'bg-emerald-500/15 text-emerald-300',
  bank: 'bg-blue-500/15 text-blue-300',
  digital: 'bg-violet-500/15 text-violet-300',
  investment: 'bg-amber-500/15 text-amber-300',
  credit: 'bg-red-500/15 text-red-300',
};

function fmt(value: string, currency = 'USD') {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: AccountOut) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState<AccountCreate>({
    name: '', account_type: 'bank', currency: 'USD', initial_balance: '0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const account = await api.accounts.create(token, form);
      onCreated(account);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nueva cuenta</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
            <AlertCircle size={14} />{error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre</label>
            <input className={field} placeholder="Ej: Cuenta corriente" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo</label>
              <select className={field} value={form.account_type}
                onChange={e => setForm(f => ({ ...f, account_type: e.target.value as AccountType }))}>
                {(Object.keys(TYPE_LABELS) as AccountType[]).map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
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
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Balance inicial</label>
            <input className={field} type="number" step="0.01" min="0" placeholder="0.00"
              value={form.initial_balance}
              onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Crear cuenta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({
  account, onClose, onUpdated,
}: { account: AccountOut; onClose: () => void; onUpdated: (a: AccountOut) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState<AccountUpdate>({ name: account.name, balance: account.balance });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const updated = await api.accounts.update(token, account.id, form);
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
          <h2 className="text-lg font-semibold text-white">Editar cuenta</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
            <AlertCircle size={14} />{error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre</label>
            <input className={field} value={form.name ?? ''} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Balance</label>
            <input className={field} type="number" step="0.01" value={form.balance ?? ''}
              onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.name?.trim()}
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

export default function AccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AccountOut | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    api.accounts.list(token)
      .then(setAccounts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async (account: AccountOut) => {
    if (!token) return;
    setToggling(account.id);
    try {
      const updated = await api.accounts.update(token, account.id, { is_active: !account.is_active });
      setAccounts(prev => prev.map(a => a.id === account.id ? updated : a));
    } catch {
      // silent
    } finally {
      setToggling(null);
    }
  };

  const totalBalance = accounts
    .filter(a => a.is_active)
    .reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Cuentas</h1>
          <p className="text-slate-400 text-sm mt-1">
            {accounts.filter(a => a.is_active).length} activas ·{' '}
            Balance total: <span className="text-white font-medium">{new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' }).format(totalBalance)}</span>
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} />Nueva cuenta
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />Cargando cuentas…
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Wallet size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Sin cuentas aún</p>
            <p className="text-sm mt-1">Crea tu primera cuenta para empezar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3.5 text-left font-medium">Cuenta</th>
                <th className="px-5 py-3.5 text-left font-medium">Tipo</th>
                <th className="px-5 py-3.5 text-left font-medium">Moneda</th>
                <th className="px-5 py-3.5 text-right font-medium">Balance</th>
                <th className="px-5 py-3.5 text-center font-medium">Estado</th>
                <th className="px-5 py-3.5 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {accounts.map(account => (
                <tr key={account.id} className={`transition-colors hover:bg-bg-elevated/50 ${!account.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Wallet size={14} className="text-primary-light" />
                      </div>
                      <span className="font-medium text-white">{account.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${TYPE_COLORS[account.account_type]}`}>
                      {TYPE_LABELS[account.account_type]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{account.currency}</td>
                  <td className="px-5 py-4 text-right font-mono font-medium text-white">
                    {fmt(account.balance, account.currency)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => handleToggle(account)} disabled={toggling === account.id}
                      className="inline-flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50"
                      title={account.is_active ? 'Desactivar' : 'Activar'}>
                      {toggling === account.id
                        ? <Loader2 size={16} className="animate-spin text-slate-400" />
                        : account.is_active
                          ? <ToggleRight size={22} className="text-accent" />
                          : <ToggleLeft size={22} className="text-slate-600" />}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => setEditing(account)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-primary-light hover:bg-primary/10 transition-colors"
                      title="Editar">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={account => { setAccounts(prev => [account, ...prev]); setShowCreate(false); }}
        />
      )}
      {editing && (
        <EditModal
          account={editing}
          onClose={() => setEditing(null)}
          onUpdated={updated => {
            setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
