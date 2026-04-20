'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '/dashboard';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      const pair = await api.auth.login({ email: email.trim().toLowerCase(), password });
      localStorage.setItem('cf_access',  pair.access_token);
      localStorage.setItem('cf_refresh', pair.refresh_token);
      document.cookie = 'cf_logged_in=1; path=/; SameSite=Strict; max-age=604800';
      router.replace(from);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 || err.status === 403
          ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
          : err.message,
        );
      } else {
        setError('Sin conexión al servidor. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400" htmlFor="password">
              Contraseña
            </label>
            <Link href="/forgot-password" className="text-xs text-primary-light hover:text-primary transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors mt-2"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Entrando…</>
          ) : (
            <>Iniciar sesión <ArrowRight size={15} /></>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-primary-light hover:text-white font-medium transition-colors">
          Regístrate gratis
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="glass rounded-2xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bienvenido de vuelta</h1>
        <p className="text-slate-400 text-sm mt-1">Inicia sesión en tu cuenta</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
