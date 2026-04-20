import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-4xl mx-auto relative">
        {/* glow blob */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl pointer-events-none" />

        <div className="relative bg-bg-surface border border-bg-border rounded-3xl px-8 py-16 text-center overflow-hidden">
          {/* decorative grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-light mb-4 opacity-80">
              Empieza hoy
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
              Deja de adivinar<br />
              <span className="gradient-text">en qué gastas tu dinero</span>
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-10 text-base">
              Crea tu cuenta en segundos y registra tu primera transacción con una sola frase.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3.5 rounded-xl transition-all glow-primary text-base"
              >
                Crear cuenta gratis
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 border border-bg-border hover:border-primary/50 text-slate-300 font-medium px-8 py-3.5 rounded-xl transition-colors text-base"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <p className="mt-6 text-xs text-slate-600">Sin tarjeta de crédito · Sin anuncios · Tus datos son tuyos</p>
          </div>
        </div>
      </div>
    </section>
  );
}
