'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return; }

    setLoading(true);
    try {
      await api.auth.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sin conexión al servidor. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
        <p className="text-slate-400 text-sm mt-1">
          Te enviaremos un enlace para restablecerla
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle size={40} className="text-green-400" />
          <p className="text-slate-300 text-sm leading-relaxed">
            Si <strong className="text-white">{email}</strong> está registrado, recibirás
            un enlace de recuperación en los próximos minutos.
          </p>
          <Link
            href="/login"
            className="mt-2 text-sm text-primary-light hover:text-white transition-colors"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 mb-5 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300 animate-slide-up">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando…</>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            <Link href="/login" className="inline-flex items-center gap-1 text-primary-light hover:text-white transition-colors">
              <ArrowLeft size={13} /> Volver al inicio de sesión
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
