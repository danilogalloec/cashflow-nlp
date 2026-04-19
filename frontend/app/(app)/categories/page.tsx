'use client';

import { useEffect, useState } from 'react';
import { Plus, Tag, Loader2, AlertCircle, X, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { CategoryOut, CategoryCreate, CategoryUpdate } from '@/lib/types';

const PRESET_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFEAA7', '#55EFC4', '#4ECDC4',
  '#45B7D1', '#74B9FF', '#A29BFE', '#DDA0DD', '#98D8C8',
  '#96CEB4', '#B2BEC3', '#FD79A8', '#6C5CE7', '#00B894',
];

const field = 'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: CategoryOut) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState<CategoryCreate>({ name: '', color: '#74B9FF' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const cat = await api.categories.create(token, form);
      onCreated(cat);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Nueva categoría</h2>
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
            <input className={field} placeholder="Ej: Mascotas, Viajes, Deporte…" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-surface scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input type="color" value={form.color ?? '#74B9FF'}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-9 rounded-lg cursor-pointer bg-bg-elevated border border-bg-border p-0.5" />
              <span className="text-xs text-slate-500">O elige un color personalizado</span>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.name.trim()}
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
function EditModal({ cat, onClose, onUpdated }: { cat: CategoryOut; onClose: () => void; onUpdated: (c: CategoryOut) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState<CategoryUpdate>({ name: cat.name, color: cat.color ?? '#74B9FF' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const updated = await api.categories.update(token, cat.id, form);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Editar categoría</h2>
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
            <label className="block text-xs font-medium text-slate-400 mb-2">Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-surface scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input type="color" value={form.color ?? '#74B9FF'}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-9 rounded-lg cursor-pointer bg-bg-elevated border border-bg-border p-0.5" />
              <span className="text-xs text-slate-500">O elige un color personalizado</span>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-bg-border text-sm text-slate-400 hover:text-white transition-colors">
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CategoryOut | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.categories.list(token)
      .then(setCategories)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDelete = async (cat: CategoryOut) => {
    if (!token) return;
    setDeleting(cat.id);
    try {
      await api.categories.remove(token, cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const system = categories.filter(c => c.is_system);
  const custom = categories.filter(c => !c.is_system);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorías</h1>
          <p className="text-slate-400 text-sm mt-1">
            {system.length} del sistema · {custom.length} personalizadas
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} />Nueva categoría
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle size={14} />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={20} className="animate-spin mr-2" />Cargando…
        </div>
      ) : (
        <div className="space-y-8">
          {/* Custom categories */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Mis categorías ({custom.length})
            </h2>
            {custom.length === 0 ? (
              <div className="bg-bg-surface border border-bg-border border-dashed rounded-2xl py-12 flex flex-col items-center text-slate-500">
                <Tag size={32} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Sin categorías personalizadas</p>
                <p className="text-xs mt-1">Crea una para organizar mejor tus gastos</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-4 flex items-center gap-1.5 text-xs text-primary-light hover:underline">
                  <Plus size={12} />Crear categoría
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {custom.map(cat => (
                  <CategoryCard key={cat.id} cat={cat} deleting={deleting}
                    onEdit={() => setEditing(cat)} onDelete={() => handleDelete(cat)} />
                ))}
              </div>
            )}
          </div>

          {/* System categories */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Categorías del sistema ({system.length})
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {system.map(cat => (
                <CategoryCard key={cat.id} cat={cat} deleting={deleting}
                  onEdit={() => setEditing(cat)} onDelete={null} />
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={cat => { setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name))); setShowCreate(false); }}
        />
      )}
      {editing && (
        <EditModal
          cat={editing}
          onClose={() => setEditing(null)}
          onUpdated={updated => {
            setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryCard({ cat, deleting, onEdit, onDelete }: {
  cat: CategoryOut;
  deleting: string | null;
  onEdit: () => void;
  onDelete: (() => void) | null;
}) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-4 flex items-center gap-3 group hover:border-slate-600 transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: cat.color ? `${cat.color}25` : '#ffffff10' }}>
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color ?? '#B2BEC3' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{cat.name}</p>
        {cat.is_system && <p className="text-xs text-slate-600">Sistema</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-light hover:bg-primary/10 transition-colors"
          title="Editar color">
          <Pencil size={13} />
        </button>
        {onDelete && (
          <button onClick={onDelete} disabled={deleting === cat.id}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            title="Eliminar">
            {deleting === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}
