'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Loader2, AlertCircle, X, CheckCircle, Calendar, Pencil, Clock, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { SubscriptionOut, SubscriptionCreate, SubscriptionUpdate, CurrencyCode, IncomeFrequency } from '@/lib/types';

const FREQ_LABELS: Record<IncomeFrequency, string> = {
  once: 'Única vez', daily: 'Diario', weekly: 'Semanal',
  biweekly: 'Quincenal', monthly: 'Mensual', annual: 'Anual',
};

const FREQ_MULTIPLIERS: Record<IncomeFrequency, number> = {
  once: 0, daily: 30, weekly: 4.33, biweekly: 2.17, monthly: 1, annual: 1 / 12,
};

function remainingMonths(endDate: string): number {
  const end = new Date(endDate + 'T00:00:00');
  const now = new Date();
  return Math.max(0, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
}

function fmt(value: string, currency = 'USD') {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

const field = 'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

function addMonths(base: string, months: number): string {
  const d = base ? new Date(base + 'T00:00:00') : new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ── Create Modal ───────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: SubscriptionOut) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState<SubscriptionCreate>({
    name: '', amount: '', currency: 'USD', frequency: 'monthly',
  });
  const [durationMonths, setDurationMonths] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMonthsChange = (val: string) => {
    setDurationMonths(val);
    const n = parseInt(val);
    if (n > 0) {
      setForm(f => ({ ...f, end_date: addMonths(f.next_due ?? '', n) }));
    } else {
      setForm(f => ({ ...f, end_date: undefined }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const sub = await api.subscriptions.create(token, form);
      onCreated(sub);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al crear la suscripción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nueva suscripción</h2>
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
            <input className={field} placeholder="Ej: Netflix, Maestría, Gimnasio…" value={form.name}
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
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Primer cobro (opcional)</label>
            <input className={field} type="date" value={form.next_due ?? ''}
              onChange={e => {
                const nd = e.target.value || undefined;
                setForm(f => {
                  const months = parseInt(durationMonths);
                  return { ...f, next_due: nd, end_date: months > 0 ? addMonths(nd ?? '', months) : f.end_date };
                });
              }} />
          </div>

          {/* Duration section */}
          <div className="bg-bg-elevated border border-bg-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock size={12} />Duración limitada (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Número de meses</label>
                <input
                  className={field}
                  type="number" min="1" max="360" placeholder="Ej: 24"
                  value={durationMonths}
                  onChange={e => handleMonthsChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha de fin calculada</label>
                <input
                  className={field}
                  type="date"
                  value={form.end_date ?? ''}
                  onChange={e => {
                    setDurationMonths('');
                    setForm(f => ({ ...f, end_date: e.target.value || undefined }));
                  }}
                />
              </div>
            </div>
            {form.end_date && (
              <p className="text-xs text-amber-400">
                Esta suscripción termina el {new Date(form.end_date + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Notas (opcional)</label>
            <input className={field} placeholder="Ej: plan familiar, cuenta compartida…"
              value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || undefined }))} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.name.trim() || !form.amount}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({ sub, onClose, onUpdated }: { sub: SubscriptionOut; onClose: () => void; onUpdated: (s: SubscriptionOut) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState<SubscriptionUpdate>({
    name: sub.name, amount: sub.amount, frequency: sub.frequency,
    next_due: sub.next_due ?? undefined, end_date: sub.end_date ?? undefined,
  });
  const [durationMonths, setDurationMonths] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMonthsChange = (val: string) => {
    setDurationMonths(val);
    const n = parseInt(val);
    if (n > 0) {
      setForm(f => ({ ...f, end_date: addMonths(f.next_due ?? sub.next_due ?? '', n) }));
    } else {
      setForm(f => ({ ...f, end_date: undefined }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const updated = await api.subscriptions.update(token, sub.id, form);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Editar suscripción</h2>
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
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Monto</label>
            <input className={field} type="number" step="0.01" min="0.01" value={form.amount ?? ''}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Frecuencia</label>
            <select className={field} value={form.frequency ?? 'monthly'}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value as IncomeFrequency }))}>
              {(Object.keys(FREQ_LABELS) as IncomeFrequency[]).map(fr => (
                <option key={fr} value={fr}>{FREQ_LABELS[fr]}</option>
              ))}
            </select>
          </div>

          {/* Duration section */}
          <div className="bg-bg-elevated border border-bg-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock size={12} />Duración limitada (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Meses restantes</label>
                <input
                  className={field}
                  type="number" min="1" max="360" placeholder="Ej: 24"
                  value={durationMonths}
                  onChange={e => handleMonthsChange(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha de fin</label>
                <input
                  className={field}
                  type="date"
                  value={form.end_date ?? ''}
                  onChange={e => {
                    setDurationMonths('');
                    setForm(f => ({ ...f, end_date: e.target.value || undefined }));
                  }}
                />
              </div>
            </div>
            {form.end_date && (
              <p className="text-xs text-amber-400">
                Termina el {new Date(form.end_date + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
            {form.end_date && (
              <button type="button" onClick={() => { setDurationMonths(''); setForm(f => ({ ...f, end_date: undefined })); }}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                Quitar fecha de fin
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.name?.trim() || !form.amount}
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

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const { token } = useAuth();
  const [subs, setSubs] = useState<SubscriptionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SubscriptionOut | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    api.subscriptions.list(token)
      .then(setSubs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async (sub: SubscriptionOut) => {
    if (!token) return;
    try {
      const updated = await api.subscriptions.update(token, sub.id, { is_active: !sub.is_active });
      setSubs(prev => prev.map(s => s.id === sub.id ? updated : s));
    } catch { /* silent */ }
  };

  const handlePay = async (sub: SubscriptionOut) => {
    if (!token) return;
    setPaying(sub.id);
    try {
      await api.subscriptions.pay(token, sub.id);
      setPaySuccess(sub.id);
      load();
      setTimeout(() => setPaySuccess(null), 2500);
    } catch { /* silent */ }
    finally { setPaying(null); }
  };

  const monthlyTotal = subs
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + parseFloat(s.amount) * (FREQ_MULTIPLIERS[s.frequency] ?? 1), 0);

  const activeSubs = subs.filter(s => s.is_active);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Suscripciones</h1>
          <p className="text-slate-400 text-sm mt-1">
            {activeSubs.length} activas ·{' '}
            Gasto mensual equiv.:{' '}
            <span className="text-red-400 font-medium">
              {new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' }).format(monthlyTotal)}
            </span>
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} />Nueva suscripción
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
            <Loader2 size={20} className="animate-spin mr-2" />Cargando suscripciones…
          </div>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Sin suscripciones</p>
            <p className="text-sm mt-1">Agrega Netflix, Spotify, gimnasio u otros pagos recurrentes</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3.5 text-left font-medium">Suscripción</th>
                <th className="px-5 py-3.5 text-left font-medium">Frecuencia</th>
                <th className="px-5 py-3.5 text-left font-medium">Próximo cobro</th>
                <th className="px-5 py-3.5 text-left font-medium">Duración</th>
                <th className="px-5 py-3.5 text-right font-medium">Monto</th>
                <th className="px-5 py-3.5 text-right font-medium">Equiv. mensual</th>
                <th className="px-5 py-3.5 text-center font-medium">Estado</th>
                <th className="px-5 py-3.5 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {subs.map(sub => {
                const monthly = parseFloat(sub.amount) * (FREQ_MULTIPLIERS[sub.frequency] ?? 1);
                return (
                  <tr key={sub.id} className={`hover:bg-bg-elevated/50 transition-colors ${!sub.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <RefreshCw size={13} className="text-red-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{sub.name}</p>
                          {sub.notes && <p className="text-xs text-slate-500 truncate max-w-xs">{sub.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-500/10 text-slate-300 rounded-lg text-xs font-medium">
                        {FREQ_LABELS[sub.frequency]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {sub.next_due ? (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar size={12} />
                          {new Date(sub.next_due).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {sub.end_date ? (() => {
                        const mo = remainingMonths(sub.end_date);
                        return (
                          <div>
                            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                              <Clock size={11} />
                              {mo > 0 ? `${mo} meses restantes` : 'Finalizada'}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Fin: {new Date(sub.end_date + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        );
                      })() : (
                        <span className="text-slate-600 text-xs">Sin límite</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-red-400">
                      {fmt(sub.amount, sub.currency)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-slate-400 text-xs">
                      {fmt(monthly.toFixed(2), sub.currency)}/mes
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => handleToggle(sub)}
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          sub.is_active
                            ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-slate-500/15 text-slate-400 hover:bg-slate-500/25'
                        }`}>
                        {sub.is_active ? 'Activa' : 'Pausada'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {sub.is_active && (
                          <button
                            onClick={() => handlePay(sub)}
                            disabled={paying === sub.id}
                            title="Registrar pago"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                              paySuccess === sub.id
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                            }`}>
                            {paying === sub.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : paySuccess === sub.id
                              ? <CheckCircle size={11} />
                              : <CreditCard size={11} />}
                            {paySuccess === sub.id ? 'Pagado' : 'Pagar'}
                          </button>
                        )}
                        <button onClick={() => setEditing(sub)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-light hover:bg-primary/10 transition-colors"
                          title="Editar">
                          <Pencil size={14} />
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

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={sub => { setSubs(prev => [sub, ...prev]); setShowCreate(false); }}
        />
      )}
      {editing && (
        <EditModal
          sub={editing}
          onClose={() => setEditing(null)}
          onUpdated={updated => {
            setSubs(prev => prev.map(s => s.id === updated.id ? updated : s));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
