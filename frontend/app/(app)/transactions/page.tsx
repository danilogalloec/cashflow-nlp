'use client';

import { useEffect, useState } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2, AlertCircle, X, CheckCircle, Trash2, Filter, Pencil, Search, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { TransactionOut, TransactionCreate, TransactionDirection, AccountOut, AccountType, CategoryOut } from '@/lib/types';

const DIR_LABELS: Record<TransactionDirection, string> = {
  income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia',
};

const DIR_COLORS: Record<TransactionDirection, string> = {
  income: 'bg-emerald-500/15 text-emerald-300',
  expense: 'bg-red-500/15 text-red-300',
  transfer: 'bg-blue-500/15 text-blue-300',
};

const DIR_ICONS: Record<TransactionDirection, React.ReactNode> = {
  income: <ArrowDownLeft size={14} className="text-emerald-400" />,
  expense: <ArrowUpRight size={14} className="text-red-400" />,
  transfer: <ArrowLeftRight size={14} className="text-blue-400" />,
};

function fmt(value: string, currency = 'USD') {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

function CreateModal({ accounts: initialAccounts, categories, onClose, onCreated }: {
  accounts: AccountOut[];
  categories: CategoryOut[];
  onClose: () => void;
  onCreated: (t: TransactionOut) => void;
}) {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [form, setForm] = useState<TransactionCreate>({
    account_id: initialAccounts[0]?.id ?? '',
    direction: 'expense',
    amount: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [creatingCash, setCreatingCash] = useState(false);
  const [error, setError] = useState('');
  const [quickCreate, setQuickCreate] = useState<{ type: AccountType; name: string } | null>(null);
  const [quickBalance, setQuickBalance] = useState('0');

  const hasCash   = accounts.some(a => a.account_type === 'cash');
  const hasCredit = accounts.some(a => a.account_type === 'credit');

  const confirmQuickCreate = async () => {
    if (!token || !quickCreate) return;
    setCreatingCash(true);
    try {
      const acc = await api.accounts.create(token, {
        name: quickCreate.name,
        account_type: quickCreate.type,
        currency: 'USD',
        initial_balance: quickBalance || '0',
      });
      setAccounts(prev => [...prev, acc]);
      setForm(f => ({ ...f, account_id: acc.id }));
      setQuickCreate(null);
      setQuickBalance('0');
    } catch {
      setError(`No se pudo crear la cuenta`);
    } finally {
      setCreatingCash(false);
    }
  };

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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">Pagado con</label>
              <div className="flex items-center gap-2">
                {!hasCash && !quickCreate && (
                  <button type="button" onClick={() => setQuickCreate({ type: 'cash', name: 'Efectivo' })}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary-light transition-colors">
                    <Plus size={10} />Efectivo
                  </button>
                )}
                {!hasCredit && !quickCreate && (
                  <button type="button" onClick={() => setQuickCreate({ type: 'credit', name: 'Tarjeta de crédito' })}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary-light transition-colors">
                    <Plus size={10} />Tarjeta crédito
                  </button>
                )}
              </div>
            </div>

            {quickCreate ? (
              <div className="bg-bg-elevated border border-primary/30 rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium text-white">
                  {quickCreate.type === 'cash' ? '💵' : '💳'} Nueva cuenta: <span className="text-primary-light">{quickCreate.name}</span>
                </p>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {quickCreate.type === 'cash' ? '¿Cuánto efectivo tienes ahora?' : 'Límite / balance actual (opcional)'}
                  </label>
                  <input
                    className={field} type="number" step="0.01" min="0" placeholder="0.00"
                    value={quickBalance}
                    onChange={e => setQuickBalance(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setQuickCreate(null)}
                    className="flex-1 py-1.5 rounded-lg border border-bg-border text-xs text-slate-400 hover:text-white transition-colors">
                    Cancelar
                  </button>
                  <button type="button" onClick={confirmQuickCreate} disabled={creatingCash}
                    className="flex-1 flex items-center justify-center gap-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {creatingCash ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                    Crear y seleccionar
                  </button>
                </div>
              </div>
            ) : (
              <select className={field} value={form.account_id}
                onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                {accounts.map(a => {
                  const icon = a.account_type === 'cash' ? ' 💵' : a.account_type === 'credit' ? ' 💳' : a.account_type === 'bank' ? ' 🏦' : '';
                  return <option key={a.id} value={a.id}>{a.name}{icon}</option>;
                })}
              </select>
            )}
          </div>

          {accounts.find(a => a.id === form.account_id)?.account_type === 'credit' && (
            <div className="bg-bg-elevated border border-bg-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">💳 ¿Pago diferido?</span>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, installments: f.installments ? undefined : 3 }))}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${form.installments ? 'bg-primary/20 text-primary-light' : 'bg-bg-border text-slate-400 hover:text-white'}`}>
                  {form.installments ? 'Sí, diferido' : 'No / contado'}
                </button>
              </div>
              {form.installments && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Número de cuotas</label>
                  <div className="flex gap-2 flex-wrap">
                    {[3, 6, 12, 18, 24, 36].map(n => (
                      <button key={n} type="button"
                        onClick={() => setForm(f => ({ ...f, installments: n }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${form.installments === n ? 'bg-primary text-white' : 'bg-bg-border text-slate-400 hover:text-white'}`}>
                        {n}
                      </button>
                    ))}
                    <input type="number" min="2" max="360" placeholder="otro"
                      className="w-16 bg-bg-border border border-bg-border rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-primary/60"
                      value={[3,6,12,18,24,36].includes(form.installments!) ? '' : (form.installments ?? '')}
                      onChange={e => { const n = parseInt(e.target.value); if (n >= 2) setForm(f => ({ ...f, installments: n })); }} />
                  </div>
                  {form.installments && form.amount && (
                    <p className="text-xs text-amber-400 mt-2">
                      ≈ {new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' }).format(parseFloat(form.amount) / form.installments)} / cuota
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo</label>
              <select className={field} value={form.direction}
                onChange={e => setForm(f => ({ ...f, direction: e.target.value as TransactionDirection }))}>
                {(Object.keys(DIR_LABELS) as TransactionDirection[]).map(d => (
                  <option key={d} value={d}>{DIR_LABELS[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Monto</label>
              <input className={field} type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Descripción</label>
            <input className={field} placeholder="Opcional" value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría</label>
            <select className={field} value={form.category_id ?? ''}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value || undefined }))}>
              <option value="">Sin categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  tx, categories, onClose, onUpdated,
}: {
  tx: TransactionOut;
  categories: CategoryOut[];
  onClose: () => void;
  onUpdated: (t: TransactionOut) => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    description: tx.description ?? '',
    category_id: tx.category_id ?? '',
    transaction_date: tx.transaction_date.slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const updated = await api.transactions.update(token, tx.id, {
        description: form.description || undefined,
        category_id: form.category_id || undefined,
        transaction_date: form.transaction_date,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = 'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Editar transacción</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-bg-elevated rounded-xl">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${DIR_COLORS[tx.direction]}`}>
            {DIR_ICONS[tx.direction]}{DIR_LABELS[tx.direction]}
          </span>
          <span className="font-mono font-bold text-white">{tx.amount} {tx.currency}</span>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
            <AlertCircle size={14} />{error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Descripción</label>
            <input className={fieldCls} placeholder="¿En qué se gastó?" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría</label>
            <select className={fieldCls} value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha</label>
            <input className={fieldCls} type="date" value={form.transaction_date}
              onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
          </div>
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

export default function TransactionsPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TransactionOut | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [filterDir, setFilterDir] = useState<TransactionDirection | ''>('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = [filterDir, filterAccount, filterCategory, filterSearch, filterFrom, filterTo].filter(Boolean).length;

  const load = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.transactions.list(token, {
        direction: filterDir || undefined,
        account_id: filterAccount || undefined,
        category_id: filterCategory || undefined,
        search: filterSearch || undefined,
        from_date: filterFrom || undefined,
        to_date: filterTo || undefined,
        limit: 200,
      }),
      api.accounts.list(token),
      api.categories.list(token),
    ])
      .then(([txs, accs, cats]) => { setTransactions(txs); setAccounts(accs); setCategories(cats); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, filterDir, filterAccount, filterCategory, filterSearch, filterFrom, filterTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!token) return;
    setDeleting(id);
    try {
      await api.transactions.remove(token, id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch { /* silent */ }
    finally { setDeleting(null); }
  };

  const handleExport = () => {
    const url = api.transactions.exportCsv({
      direction: filterDir || undefined,
      account_id: filterAccount || undefined,
      category_id: filterCategory || undefined,
      search: filterSearch || undefined,
      from_date: filterFrom || undefined,
      to_date: filterTo || undefined,
    });
    // Attach token via hidden anchor — backend must accept token via query or cookie
    // We'll open it in a new tab; user must be logged in (cookie-based or proxy)
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transacciones.csv';
    a.click();
  };

  const accountName = (id: string) => accounts.find(a => a.id === id)?.name ?? id.slice(0, 8);

  const selectCls = 'bg-bg-elevated border border-bg-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60 transition-colors';
  const inputCls = 'bg-bg-elevated border border-bg-border rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transacciones</h1>
          <p className="text-slate-400 text-sm mt-1">{transactions.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            title="Exportar CSV"
            className="flex items-center gap-2 bg-bg-elevated hover:bg-bg-border border border-bg-border text-slate-300 hover:text-white text-sm px-3 py-2.5 rounded-xl transition-colors">
            <Download size={14} />CSV
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={15} />Nueva
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className={`${inputCls} pl-9 w-full`}
                placeholder="Buscar por descripción…"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
              />
            </div>
          </div>
          <select className={selectCls} value={filterDir} onChange={e => setFilterDir(e.target.value as TransactionDirection | '')}>
            <option value="">Todos los tipos</option>
            {(Object.keys(DIR_LABELS) as TransactionDirection[]).map(d => (
              <option key={d} value={d}>{DIR_LABELS[d]}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${showFilters || activeFiltersCount > 0 ? 'border-primary/40 bg-primary/10 text-primary-light' : 'border-bg-border bg-bg-elevated text-slate-400 hover:text-white'}`}>
            <Filter size={13} />
            Filtros{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </button>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-bg-surface border border-bg-border rounded-xl">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cuenta</label>
              <select className={`${selectCls} w-full`} value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
                <option value="">Todas</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Categoría</label>
              <select className={`${selectCls} w-full`} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Desde</label>
              <input type="date" className={`${inputCls} w-full`} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hasta</label>
              <input type="date" className={`${inputCls} w-full`} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setFilterDir(''); setFilterAccount(''); setFilterCategory(''); setFilterSearch(''); setFilterFrom(''); setFilterTo(''); }}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors col-span-full text-left">
                Limpiar todos los filtros
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />Cargando…
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ArrowLeftRight size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Sin transacciones</p>
            <p className="text-sm mt-1">
              {activeFiltersCount > 0 ? 'No hay resultados para los filtros aplicados' : 'Crea tu primera transacción para empezar'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3.5 text-left font-medium">Fecha</th>
                <th className="px-5 py-3.5 text-left font-medium">Descripción</th>
                <th className="px-5 py-3.5 text-left font-medium">Categoría</th>
                <th className="px-5 py-3.5 text-left font-medium">Tipo</th>
                <th className="px-5 py-3.5 text-left font-medium">Cuenta</th>
                <th className="px-5 py-3.5 text-right font-medium">Monto</th>
                <th className="px-5 py-3.5 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {transactions.map(tx => {
                const cat = categories.find(c => c.id === tx.category_id);
                return (
                  <tr key={tx.id} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-5 py-4 text-slate-400 tabular-nums">
                      {new Date(tx.transaction_date).toLocaleDateString('es-GT')}
                    </td>
                    <td className="px-5 py-4 text-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{tx.description ?? <span className="text-slate-600 italic">Sin descripción</span>}</span>
                        {tx.installments && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 text-xs font-medium">
                            💳 {tx.installments} cuotas
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {cat ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-500/10 text-slate-300">
                          {cat.color && (
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          )}
                          {cat.name}
                        </span>
                      ) : (
                        <button onClick={() => setEditing(tx)}
                          className="text-xs text-slate-600 hover:text-primary-light transition-colors italic">
                          + categoría
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${DIR_COLORS[tx.direction]}`}>
                        {DIR_ICONS[tx.direction]}{DIR_LABELS[tx.direction]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{accountName(tx.account_id)}</td>
                    <td className={`px-5 py-4 text-right font-mono font-semibold ${tx.direction === 'income' ? 'text-emerald-400' : tx.direction === 'expense' ? 'text-red-400' : 'text-slate-300'}`}>
                      {tx.direction === 'expense' ? '-' : '+'}{fmt(tx.amount, tx.currency)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditing(tx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-light hover:bg-primary/10 transition-colors"
                          title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} disabled={deleting === tx.id}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Eliminar">
                          {deleting === tx.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
          categories={categories}
          onClose={() => setShowCreate(false)}
          onCreated={tx => { setTransactions(prev => [tx, ...prev]); setShowCreate(false); }}
        />
      )}
      {editing && (
        <EditModal
          tx={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onUpdated={updated => {
            setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
