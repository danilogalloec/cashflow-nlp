'use client';

import { useState } from 'react';
import { User, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();

  // ── Personal info ──
  const [infoForm, setInfoForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoSuccess, setInfoSuccess] = useState(false);

  // ── Password ──
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', new_password_confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const field =
    'w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors';

  const submitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setInfoLoading(true);
    setInfoError('');
    setInfoSuccess(false);
    try {
      await api.auth.updateProfile(token, {
        name: infoForm.name.trim() || undefined,
        email: infoForm.email.trim() || undefined,
      });
      await refreshUser();
      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch (err) {
      setInfoError(err instanceof ApiError ? err.message : 'Error al actualizar');
    } finally {
      setInfoLoading(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (pwForm.new_password !== pwForm.new_password_confirm) {
      setPwError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setPwLoading(true);
    setPwError('');
    setPwSuccess(false);
    try {
      await api.auth.updateProfile(token, {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        new_password_confirm: pwForm.new_password_confirm,
      });
      setPwSuccess(true);
      setPwForm({ current_password: '', new_password: '', new_password_confirm: '' });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : 'Error al cambiar contraseña');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Perfil</h1>
        <p className="text-slate-400 text-sm mt-1">Administra tu información personal y contraseña</p>
      </div>

      {/* Personal info */}
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <User size={16} className="text-primary-light" />
          </div>
          <h2 className="text-base font-semibold text-white">Información personal</h2>
        </div>

        {infoError && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
            <AlertCircle size={14} />{infoError}
          </div>
        )}
        {infoSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm text-emerald-300">
            <CheckCircle size={14} />Información actualizada correctamente.
          </div>
        )}

        <form onSubmit={submitInfo} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre</label>
            <input
              className={field}
              value={infoForm.name}
              onChange={e => setInfoForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo electrónico</label>
            <input
              className={field}
              type="email"
              value={infoForm.email}
              onChange={e => setInfoForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={infoLoading}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {infoLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Lock size={16} className="text-amber-400" />
          </div>
          <h2 className="text-base font-semibold text-white">Cambiar contraseña</h2>
        </div>

        {pwError && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
            <AlertCircle size={14} />{pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm text-emerald-300">
            <CheckCircle size={14} />Contraseña actualizada correctamente.
          </div>
        )}

        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Contraseña actual</label>
            <input
              className={field}
              type="password"
              autoComplete="current-password"
              value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nueva contraseña</label>
            <input
              className={field}
              type="password"
              autoComplete="new-password"
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              required
            />
            <p className="text-xs text-slate-600 mt-1.5">Mínimo 12 caracteres, mayúscula, minúscula, número y símbolo.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar nueva contraseña</label>
            <input
              className={field}
              type="password"
              autoComplete="new-password"
              value={pwForm.new_password_confirm}
              onChange={e => setPwForm(f => ({ ...f, new_password_confirm: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={pwLoading || !pwForm.current_password || !pwForm.new_password}
              className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 disabled:opacity-50 text-amber-300 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Cambiar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
