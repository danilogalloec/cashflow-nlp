'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

// ── Password strength ─────────────────────────────────────────────────────────

interface StrengthCriterion { label: string; met: boolean }

function usePasswordStrength(pw: string) {
  return useMemo<StrengthCriterion[]>(() => [
    { label: 'Mínimo 8 caracteres', met: pw.length >= 8 },
  ], [pw]);
}

function StrengthMeter({ criteria }: { criteria: StrengthCriterion[] }) {
  const met = criteria.filter(c => c.met).length;
  const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-accent'];
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {criteria.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < met ? colors[met - 1] : 'bg-bg-border'}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
        {criteria.map(c => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs transition-colors ${c.met ? 'text-accent-light' : 'text-slate-600'}`}>
            <CheckCircle size={10} className={c.met ? 'opacity-100' : 'opacity-30'} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const criteria = usePasswordStrength(password);
  const pwStrong  = criteria.every(c => c.met);
  const pwMatch   = password === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('Completa todos los campos.');
      return;
    }
    if (!pwStrong) {
      setError('La contraseña no cumple los requisitos de seguridad.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const pair = await api.auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        password_confirm: confirm,
      });
      localStorage.setItem('cf_access',  pair.access_token);
      localStorage.setItem('cf_refresh', pair.refresh_token);
      document.cookie = 'cf_logged_in=1; path=/; SameSite=Strict; max-age=604800';
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 409
          ? 'Ese email ya está registrado.'
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
    <div className="glass rounded-2xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Crea tu cuenta</h1>
        <p className="text-slate-400 text-sm mt-1">Gratis para siempre · Sin tarjeta de crédito</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-5 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300 animate-slide-up">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="name">
            Nombre completo
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Email */}
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

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="password">
            Contraseña
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
          {password.length > 0 && <StrengthMeter criteria={criteria} />}
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="confirm">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              className={`w-full bg-bg-elevated border rounded-xl px-4 py-2.5 pr-20 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors ${
                confirm.length > 0
                  ? pwMatch
                    ? 'border-accent/50 focus:border-accent/70'
                    : 'border-red-500/50 focus:border-red-500/70'
                  : 'border-bg-border focus:border-primary/60'
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="text-slate-500 hover:text-slate-300 transition-colors">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {confirm.length > 0 && (
                pwMatch
                  ? <CheckCircle size={15} className="text-accent" />
                  : <AlertCircle size={15} className="text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !pwStrong || !pwMatch}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors mt-2"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Creando cuenta…</>
          ) : (
            <>Crear cuenta <ArrowRight size={15} /></>
          )}
        </button>
        {(!pwStrong || !pwMatch) && !loading && (password.length > 0 || confirm.length > 0) && (
          <p className="text-xs text-slate-500 text-center -mt-1">
            {!pwStrong
              ? 'Completa los requisitos de contraseña para continuar'
              : 'Las contraseñas deben coincidir'}
          </p>
        )}
      </form>

      <p className="text-center text-xs text-slate-600 mt-4">
        Al registrarte aceptas nuestros{' '}
        <span className="text-slate-500">Términos de servicio</span> y{' '}
        <span className="text-slate-500">Política de privacidad</span>.
      </p>

      <p className="text-center text-sm text-slate-500 mt-4">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-primary-light hover:text-white font-medium transition-colors">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
