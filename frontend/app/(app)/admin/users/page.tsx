'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ShieldCheck, Shield, UserX, UserCheck, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import type { AdminUserOut } from '@/lib/types';

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminUsersPage() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<AdminUserOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    api.admin.users(token)
      .then(setUsers)
      .catch(e => setError(e instanceof ApiError ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleActive = async (u: AdminUserOut) => {
    if (!token || u.id === me?.id) return;
    setBusy(u.id);
    try {
      const updated = await api.admin.updateUser(token, u.id, { is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
    } catch { /* silent */ }
    finally { setBusy(null); }
  };

  const toggleAdmin = async (u: AdminUserOut) => {
    if (!token || u.id === me?.id) return;
    setBusy(u.id);
    try {
      const updated = await api.admin.updateUser(token, u.id, { is_admin: !u.is_admin });
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
    } catch { /* silent */ }
    finally { setBusy(null); }
  };

  const deleteUser = async (u: AdminUserOut) => {
    if (!token || u.id === me?.id) return;
    if (!confirm(`¿Eliminar al usuario ${u.name}? Esta acción no se puede deshacer.`)) return;
    setBusy(u.id);
    try {
      await api.admin.deleteUser(token, u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch { /* silent */ }
    finally { setBusy(null); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-bg-elevated transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} usuarios registrados</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="mb-5">
        <input
          className="w-full max-w-sm bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">Sin usuarios</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3.5 text-left font-medium">Usuario</th>
                <th className="px-5 py-3.5 text-left font-medium">Email</th>
                <th className="px-5 py-3.5 text-center font-medium">Registrado</th>
                <th className="px-5 py-3.5 text-center font-medium">Estado</th>
                <th className="px-5 py-3.5 text-center font-medium">Rol</th>
                <th className="px-5 py-3.5 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {filtered.map(u => {
                const isMe = u.id === me?.id;
                const isBusy = busy === u.id;
                return (
                  <tr key={u.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-light text-xs font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.name}</p>
                          {isMe && <p className="text-[11px] text-primary-light">Tú</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{u.email}</td>
                    <td className="px-5 py-4 text-center text-slate-500 text-xs">{fmt(u.created_at)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                        u.is_active
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-red-500/15 text-red-300'
                      }`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        u.is_admin
                          ? 'bg-primary/15 text-primary-light'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {u.is_admin ? <><ShieldCheck size={10} />Admin</> : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {isBusy ? (
                        <Loader2 size={14} className="animate-spin text-slate-500 mx-auto" />
                      ) : isMe ? (
                        <span className="text-xs text-slate-600">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleActive(u)}
                            title={u.is_active ? 'Desactivar' : 'Activar'}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                            {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                          </button>
                          <button
                            onClick={() => toggleAdmin(u)}
                            title={u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary-light hover:bg-primary/10 transition-colors">
                            {u.is_admin ? <Shield size={13} /> : <ShieldCheck size={13} />}
                          </button>
                          <button
                            onClick={() => deleteUser(u)}
                            title="Eliminar usuario"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
