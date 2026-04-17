const STEPS = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Registro en segundos. Tus cuentas (efectivo, banco, cripto) quedan aisladas del resto del mundo con cifrado Argon2id.',
    icon: '🔐',
  },
  {
    number: '02',
    title: 'Habla o escribe',
    description: 'Di "Gasté 50 en comida" o "Recibí mi sueldo de Q3,000". El motor NLP extrae monto, categoría y cuenta automáticamente.',
    icon: '🎙️',
  },
  {
    number: '03',
    title: 'Toma decisiones',
    description: 'Dashboards en tiempo real: saldo por cuenta, tendencias mensuales y distribución de gastos por categoría.',
    icon: '📊',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Simple por diseño</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Sin categorías manuales ni formularios interminables. Solo habla.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="relative bg-bg-surface border border-bg-border rounded-2xl p-6 hover:border-primary/40 transition-colors group"
            >
              <div className="absolute top-4 right-4 font-mono text-xs text-slate-600 group-hover:text-primary/40 transition-colors">
                {step.number}
              </div>
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Connector line (desktop only) */}
        <div className="hidden md:flex items-center justify-between mt-4 px-24 -translate-y-24 pointer-events-none">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </div>
    </section>
  );
}
