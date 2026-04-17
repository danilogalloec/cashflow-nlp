'use client';

import { useState } from 'react';
import { User, Mail, Shield, LogOut, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function InputField({ label, value, type = 'text', readOnly }: {
  label: string;
  value: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        className={`w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-colors ${readOnly ? 'opacity-60 cursor-default' : ''}`}
        onChange={() => {}}
      />
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const [pwCurrent,   setPwCurrent]   = useState('');
  const [pwNew,       setPwNew]       = useState('');
  const [pwConfirm,   setPwConfirm]   = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);
  const [pwFeedback,  setPwFeedback]  = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loggingOut,  setLoggingOut]  = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback(null);

    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwFeedback({ type: 'error', msg: 'Completa todos los campos.' });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwFeedback({ type: 'error', msg: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    if (pwNew.length < 12) {
      setPwFeedback({ type: 'error', msg: 'La contraseña debe tener al menos 12 caracteres.' });
      return;
    }

    setPwLoading(true);
    // Stub — password change endpoint not yet implemented on backend
    await new Promise(r => setTimeout(r, 800));
    setPwFeedback({ type: 'success', msg: 'Contraseña actualizada correctamente.' });
    setPwCurrent(''); setPwNew(''); setPwConfirm('');
    setPwLoading(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    // middleware + router.replace will handle the redirect
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Gestiona tu cuenta y preferencias</p>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <Section title="Perfil" description="Tu información personal">
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-bg-border">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-light text-xl font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {user?.is_verified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-accent"><CheckCircle size={11} /> Verificado</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400"><AlertCircle size={11} /> Sin verificar</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={14} className="text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Nombre</p>
                <p className="text-sm text-white font-medium truncate">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-bg-elevated border border-bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail size={14} className="text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-white font-medium truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Security */}
        <Section title="Seguridad" description="Cambia tu contraseña periódicamente">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {pwFeedback && (
              <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm border animate-slide-up ${
                pwFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/25 text-red-300'
              }`}>
                {pwFeedback.type === 'success' ? <CheckCircle size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
                {pwFeedback.msg}
              </div>
            )}

            <div className="relative">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Contraseña actual</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={pwCurrent}
                onChange={e => setPwCurrent(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-8 text-slate-500 hover:text-slate-300 transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nueva contraseña</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwNew}
                  onChange={e => setPwNew(e.target.value)}
                  placeholder="Mínimo 12 caracteres"
                  className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar nueva</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={pwLoading}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                Actualizar contraseña
              </button>
            </div>
          </form>
        </Section>

        {/* Session */}
        <Section title="Sesión" description="Gestiona tu sesión activa">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 font-medium">Cerrar sesión</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Esto revocará tu refresh token y cerrará la sesión en este dispositivo.
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/8 text-red-400 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
