'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [done,      setDone]      = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-slate-300 text-sm">El enlace es inválido o ha expirado.</p>
        <Link href="/forgot-password" className="text-sm text-primary-light hover:text-white transition-colors">
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password || !confirm) { setError('Completa todos los campos.'); return; }

    setLoading(true);
    try {
      await api.auth.resetPassword(token, password, confirm);
      setDone(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sin conexión al servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle size={40} className="text-green-400" />
        <p className="text-slate-300 text-sm">
          ¡Contraseña actualizada! Redirigiendo al inicio de sesión…
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-5 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300 animate-slide-up">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="password">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="confirm">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        <p className="text-xs text-slate-500">
          Mínimo 8 caracteres, una mayúscula, una minúscula y un número.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors mt-2"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Guardando…</>
          ) : (
            'Establecer nueva contraseña'
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="glass rounded-2xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
        <p className="text-slate-400 text-sm mt-1">Elige una contraseña segura para tu cuenta</p>
      </div>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
