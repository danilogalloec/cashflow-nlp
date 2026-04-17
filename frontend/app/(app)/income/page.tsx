'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp, Loader2, AlertCircle, X, CheckCircle, Calendar, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { AccountOut, IncomeSourceOut, IncomeSourceCreate, CurrencyCode, IncomeFrequency } from '@/lib/types';

const FREQ_LABELS: Record<IncomeFrequency, string> = {
  once: 'Única vez', daily: 'Diario', weekly: 'Semanal',
  biweekly: 'Quincenal', monthly: 'Mensual', annual: 'Anual',
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
  onCreated: (s: IncomeSourceOut) => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<IncomeSourceCreate>({
    name: '', amount: '', currency: 'USD', frequency: 'monthly',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const source = await api.income.create(token, form);
      onCreated(source);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al crear la fuente');
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nueva fuente de ingreso</h2>
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
            <input className={field} placeholder="Ej: Salario mensual" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
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
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Frecuencia</label>
            <select className={field} value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value as IncomeFrequency }))}>
              {(Object.keys(FREQ_LABELS) as IncomeFrequency[]).map(fr => (
                <option key={fr} value={fr}>{FREQ_LABELS[fr]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Próximo pago (opcional)</label>
            <input className={field} type="date" value={form.next_expected ?? ''}
              onChange={e => setForm(f => ({ ...f, next_expected: e.target.value || undefined }))} />
          </div>
          {accounts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cuenta destino (opcional)</label>
              <select className={field} value={form.account_id ?? ''}
                onChange={e => setForm(f => ({ ...f, account_id: e.target.value || undefined }))}>
                <option value="">Sin asignar</option>
                {accounts.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.name.trim() || !form.amount}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Crear fuente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditIncomeModal({
  source, accounts, onClose, onUpdated,
}: { source: IncomeSourceOut; accounts: AccountOut[]; onClose: () => void; onUpdated: (s: IncomeSourceOut) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ name: source.name, amount: source.amount, frequency: source.frequency });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const updated = await api.income.update(token, source.id, form);
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
          <h2 className="text-lg font-semibold text-white">Editar fuente</h2>
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
            <input className={field} value={form.name} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Monto</label>
            <input className={field} type="number" step="0.01" min="0.01" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Frecuencia</label>
            <select className={field} value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value as IncomeFrequency }))}>
              {(Object.keys(FREQ_LABELS) as IncomeFrequency[]).map(fr => (
                <option key={fr} value={fr}>{FREQ_LABELS[fr]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.name.trim() || !form.amount}
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

export default function IncomePage() {
  const { token } = useAuth();
  const [sources, setSources] = useState<IncomeSourceOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<IncomeSourceOut | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([api.income.list(token), api.accounts.list(token)])
      .then(([srcs, accs]) => { setSources(srcs); setAccounts(accs); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthlyTotal = sources
    .filter(s => s.is_active)
    .reduce((sum, s) => {
      const amount = parseFloat(s.amount);
      const multipliers: Record<IncomeFrequency, number> = {
        once: 0, daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1, annual: 1 / 12,
      };
      return sum + amount * (multipliers[s.frequency] ?? 1);
    }, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Fuentes de ingreso</h1>
          <p className="text-slate-400 text-sm mt-1">
            {sources.filter(s => s.is_active).length} activas ·{' '}
            Equiv. mensual: <span className="text-emerald-400 font-medium">
              {new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' }).format(monthlyTotal)}
            </span>
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} />Nueva fuente
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />Cargando fuentes…
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <TrendingUp size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Sin fuentes de ingreso</p>
            <p className="text-sm mt-1">Agrega tu salario, freelance u otras fuentes</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3.5 text-left font-medium">Fuente</th>
                <th className="px-5 py-3.5 text-left font-medium">Frecuencia</th>
                <th className="px-5 py-3.5 text-left font-medium">Próximo pago</th>
                <th className="px-5 py-3.5 text-right font-medium">Monto</th>
                <th className="px-5 py-3.5 text-center font-medium">Estado</th>
                <th className="px-5 py-3.5 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {sources.map(src => (
                <tr key={src.id} className={`hover:bg-bg-elevated/50 transition-colors ${!src.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={14} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{src.name}</p>
                        {src.notes && <p className="text-xs text-slate-500 truncate max-w-xs">{src.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 bg-slate-500/10 text-slate-300 rounded-lg text-xs font-medium">
                      {FREQ_LABELS[src.frequency]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {src.next_expected ? (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={12} />
                        {new Date(src.next_expected).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-semibold text-emerald-400">
                    {fmt(src.amount, src.currency)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                      src.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-400'
                    }`}>
                      {src.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => setEditing(src)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
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
          accounts={accounts}
          onClose={() => setShowCreate(false)}
          onCreated={src => { setSources(prev => [src, ...prev]); setShowCreate(false); }}
        />
      )}
      {editing && (
        <EditIncomeModal
          source={editing}
          accounts={accounts}
          onClose={() => setEditing(null)}
          onUpdated={updated => {
            setSources(prev => prev.map(s => s.id === updated.id ? updated : s));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
