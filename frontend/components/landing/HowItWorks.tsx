const STEPS = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Registro en segundos. Tus cuentas quedan aisladas con cifrado Argon2id y Row-Level Security.',
    icon: '🔐',
    accent: 'from-primary/20 to-primary/5',
    border: 'hover:border-primary/50',
    glow: 'group-hover:shadow-primary/10',
  },
  {
    number: '02',
    title: 'Habla o escribe',
    description: 'Di "Gasté 50 en comida" o "Recibí mi sueldo de Q3,000". El motor NLP extrae todo al instante.',
    icon: '🎙️',
    accent: 'from-accent/20 to-accent/5',
    border: 'hover:border-accent/50',
    glow: 'group-hover:shadow-accent/10',
  },
  {
    number: '03',
    title: 'Toma decisiones',
    description: 'Dashboards en tiempo real: saldo por cuenta, tendencias mensuales y distribución de gastos.',
    icon: '📊',
    accent: 'from-emerald-500/20 to-emerald-500/5',
    border: 'hover:border-emerald-500/50',
    glow: 'group-hover:shadow-emerald-500/10',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-28 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-light mb-3 opacity-80">
            Proceso
          </span>
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Simple por <span className="gradient-text">diseño</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Sin categorías manuales ni formularios interminables. Solo habla y listo.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-6">
          {/* connector line */}
          <div className="hidden md:block absolute top-14 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-primary/30 via-accent/30 to-emerald-500/30 pointer-events-none" />

          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`relative bg-bg-surface border border-bg-border rounded-2xl p-7 transition-all duration-300 group shadow-xl ${step.border} ${step.glow}`}
            >
              {/* gradient bg */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

              <div className="relative">
                {/* step number badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className="text-4xl">{step.icon}</div>
                  <span className="font-mono text-xs font-bold text-slate-600 bg-bg-elevated border border-bg-border px-2 py-0.5 rounded-full">
                    {step.number}
                  </span>
                </div>

                <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
