'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, AlertCircle, X, CheckCircle, Trash2, Pencil, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { BudgetOut, BudgetCreate, BudgetUsage, CategoryOut } from '@/lib/types';

const field = 'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

function fmt(value: string | number) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return String(value);
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function progressColor(pct: number) {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-400';
  return 'bg-emerald-500';
}

function progressTextColor(pct: number) {
  if (pct >= 100) return 'text-red-400';
  if (pct >= 80) return 'text-amber-400';
  return 'text-emerald-400';
}

// ── Create / Edit Modal ────────────────────────────────────────────────────────
function BudgetModal({
  categories,
  editing,
  onClose,
  onSaved,
}: {
  categories: CategoryOut[];
  editing: BudgetOut | null;
  onClose: () => void;
  onSaved: (b: BudgetOut) => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<BudgetCreate>({
    name: editing?.name ?? '',
    amount: editing?.amount ?? '',
    category_id: editing?.category_id ?? undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, category_id: form.category_id || undefined };
      const result = editing
        ? await api.budgets.update(token, editing.id, payload)
        : await api.budgets.create(token, payload);
      onSaved(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">
            {editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
            <AlertCircle size={14} />{error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del presupuesto</label>
            <input className={field} placeholder="Ej: Comida, Entretenimiento…" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Límite mensual (USD)</label>
            <input className={field} type="number" step="0.01" min="0.01" placeholder="0.00"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría (opcional)</label>
            <select className={field} value={form.category_id ?? ''}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value || undefined }))}>
              <option value="">Sin categoría específica</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BudgetsPage() {
  const { token } = useAuth();
  const [budgets, setBudgets] = useState<BudgetOut[]>([]);
  const [usage, setUsage] = useState<BudgetUsage[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BudgetOut | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [b, u, c] = await Promise.all([
        api.budgets.list(token),
        api.budgets.usage(token),
        api.categories.list(token),
      ]);
      setBudgets(b);
      setUsage(u);
      setCategories(c);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!token) return;
    setDeleting(id);
    try {
      await api.budgets.remove(token, id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      setUsage(prev => prev.filter(u => u.budget_id !== id));
    } catch { /* silent */ }
    finally { setDeleting(null); }
  };

  const usageMap = Object.fromEntries(usage.map(u => [u.budget_id, u]));

  const now = new Date();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Presupuestos</h1>
          <p className="text-slate-400 text-sm mt-1">
            {now.toLocaleString('es-GT', { month: 'long', year: 'numeric' })} · {budgets.length} presupuestos activos
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} />Nuevo presupuesto
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle size={14} />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={20} className="animate-spin mr-2" />Cargando…
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-bg-surface border border-bg-border rounded-2xl">
          <Target size={36} className="mb-3 opacity-30" />
          <p className="font-medium">Sin presupuestos</p>
          <p className="text-sm mt-1">Crea un presupuesto mensual para controlar tus gastos por categoría</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {budgets.map(budget => {
            const u = usageMap[budget.id];
            const pct = u ? Math.min(u.percentage, 100) : 0;
            const spent = u ? parseFloat(u.spent) : 0;
            const limit = parseFloat(budget.amount);
            const remaining = limit - spent;

            return (
              <div key={budget.id} className="bg-bg-surface border border-bg-border rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {u?.category_color && (
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: u.category_color }} />
                    )}
                    <div>
                      <p className="font-semibold text-white text-sm">{budget.name}</p>
                      {u?.category_name && (
                        <p className="text-xs text-slate-500 mt-0.5">{u.category_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(budget); setShowModal(true); }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-primary-light hover:bg-primary/10 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(budget.id)} disabled={deleting === budget.id}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                      {deleting === budget.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Gastado</span>
                    <span className={`font-semibold ${progressTextColor(u?.percentage ?? 0)}`}>
                      {(u?.percentage ?? 0).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor(u?.percentage ?? 0)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-bg-elevated rounded-lg p-2 text-center">
                    <p className="text-slate-500 mb-0.5">Gastado</p>
                    <p className="font-semibold text-white">{fmt(spent)}</p>
                  </div>
                  <div className="bg-bg-elevated rounded-lg p-2 text-center">
                    <p className="text-slate-500 mb-0.5">Límite</p>
                    <p className="font-semibold text-white">{fmt(limit)}</p>
                  </div>
                  <div className="bg-bg-elevated rounded-lg p-2 text-center">
                    <p className="text-slate-500 mb-0.5">Disponible</p>
                    <p className={`font-semibold ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {fmt(remaining)}
                    </p>
                  </div>
                </div>

                {(u?.percentage ?? 0) >= 80 && (
                  <div className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                    (u?.percentage ?? 0) >= 100
                      ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    <AlertCircle size={11} />
                    {(u?.percentage ?? 0) >= 100
                      ? 'Presupuesto superado'
                      : 'Casi en el límite (>80%)'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BudgetModal
          categories={categories}
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={saved => {
            if (editing) {
              setBudgets(prev => prev.map(b => b.id === saved.id ? saved : b));
            } else {
              setBudgets(prev => [...prev, saved]);
            }
            load();
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
