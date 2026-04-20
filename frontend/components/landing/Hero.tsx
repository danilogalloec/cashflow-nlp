'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Mic, Sparkles } from 'lucide-react';

const DEMOS = [
  { input: 'Gasté 85 en almuerzo hoy', dir: 'GASTO', amount: '$85.00', cat: 'Alimentación', conf: 95 },
  { input: 'Recibí mi sueldo de Q5,000', dir: 'INGRESO', amount: 'Q5,000.00', cat: 'Sueldo', conf: 90 },
  { input: 'Transferí 200 de banco a efectivo', dir: 'TRANSFERENCIA', amount: '$200.00', cat: null, conf: 88 },
  { input: 'Pagué 45.50 en transporte con tarjeta', dir: 'GASTO', amount: '$45.50', cat: 'Transporte', conf: 92 },
];

const DIR_STYLE: Record<string, string> = {
  GASTO: 'text-red-400 bg-red-500/10 border-red-500/20',
  INGRESO: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  TRANSFERENCIA: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [typed, setTyped] = useState('');
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const demo = DEMOS[current];
    setTyped('');
    setShowResult(false);

    let i = 0;
    const typeInterval = setInterval(() => {
      setTyped(demo.input.slice(0, ++i));
      if (i >= demo.input.length) {
        clearInterval(typeInterval);
        setTimeout(() => setShowResult(true), 400);
        setTimeout(() => {
          setShowResult(false);
          setTimeout(() => setCurrent(c => (c + 1) % DEMOS.length), 300);
        }, 2800);
      }
    }, 38);

    return () => clearInterval(typeInterval);
  }, [current]);

  const demo = DEMOS[current];

  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      {/* ambient glows */}
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-56 h-56 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — copy */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-muted border border-primary/20 text-primary-light text-xs font-medium mb-3">
            <Sparkles size={12} />
            Motor NLP en español
          </div>
          <p className="text-xs text-slate-500 mb-4">
            <span className="font-semibold text-slate-400">NLP</span> (Procesamiento de Lenguaje Natural) entiende lo que escribes tal como lo dirías — sin formularios ni menús.
          </p>
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Controla tu dinero{' '}
            <span className="gradient-text">con tu voz</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
            Di &quot;Gasté 50 en almuerzo&quot; y CashFlow lo registra al instante.
            Sin formularios, sin fricción. Tu historial financiero en tiempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-xl transition-all glow-primary"
            >
              Empezar gratis
              <ArrowRight size={16} />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 border border-bg-border hover:border-primary/50 text-slate-300 font-medium px-6 py-3 rounded-xl transition-colors"
            >
              Ver cómo funciona
            </a>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: '100%', label: 'En español' },
              { value: 'NLP', label: 'Lenguaje natural' },
              { value: 'Gratis', label: 'Para siempre' },
            ].map((s) => (
              <div key={s.label} className="bg-bg-surface border border-bg-border rounded-xl px-4 py-3 text-center">
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — animated demo */}
        <div className="relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-bg-elevated border border-bg-border rounded-full text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Demo animada · No interactiva
            </span>
          </div>
          <div className="bg-bg-surface border border-bg-border rounded-2xl p-1 shadow-2xl">
            {/* terminal header */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-bg-border">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <span className="ml-3 text-xs text-slate-500 font-mono">cashflow — chat</span>
            </div>

            <div className="p-5 min-h-[260px] flex flex-col justify-end gap-4">
              {/* input bubble */}
              <div className="flex gap-3 items-end">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-light text-xs font-bold">U</span>
                </div>
                <div className="bg-bg-elevated border border-bg-border rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-sm text-slate-200 font-mono">
                    {typed}
                    <span className="animate-blink">|</span>
                  </p>
                </div>
              </div>

              {/* parse result */}
              {showResult && (
                <div className="flex gap-3 items-end animate-slide-up">
                  <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-light text-xs font-bold">AI</span>
                  </div>
                  <div className="bg-bg-elevated border border-bg-border rounded-2xl rounded-bl-sm p-4 max-w-[85%] w-full">
                    <div className={`inline-flex px-2 py-0.5 rounded border text-xs font-semibold mb-3 ${DIR_STYLE[demo.dir]}`}>
                      {demo.dir}
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{demo.amount}</div>
                    {demo.cat && <div className="text-xs text-slate-400 mb-3">📁 {demo.cat}</div>}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Confianza</span>
                        <span className="text-accent-light font-semibold">{demo.conf}%</span>
                      </div>
                      <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-primary-light rounded-full transition-all duration-700"
                          style={{ width: `${demo.conf}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 text-xs font-semibold text-white bg-accent hover:bg-accent-hover px-3 py-1.5 rounded-lg transition-colors">
                        ✓ Registrar
                      </button>
                      <button className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg border border-bg-border transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* input bar */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5">
                <Mic size={16} className="text-slate-500" />
                <span className="flex-1 text-sm text-slate-500">Escribe o dicta tu movimiento…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
