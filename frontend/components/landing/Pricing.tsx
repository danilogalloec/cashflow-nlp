import Link from 'next/link';

const PLANS = [
  {
    name: 'Gratis',
    price: '$0',
    period: '/mes',
    description: 'Para uso personal y estudiantes.',
    features: ['2 cuentas', '100 transacciones/mes', 'NLP en texto', 'Reportes básicos', 'Dashboard estándar'],
    cta: 'Empezar gratis',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/mes',
    description: 'Para profesionales y freelancers.',
    features: ['Cuentas ilimitadas', 'Transacciones ilimitadas', 'NLP de voz', 'Reportes avanzados', 'Exportar a CSV/PDF', 'Multi-divisa'],
    cta: 'Empezar Pro',
    href: '/register?plan=pro',
    highlight: true,
  },
  {
    name: 'Empresa',
    price: '$29',
    period: '/mes',
    description: 'Para equipos y contadores.',
    features: ['Todo lo de Pro', 'Hasta 5 usuarios', 'API access', 'Auditoría completa', 'SLA 99.9%', 'Soporte prioritario'],
    cta: 'Contactar ventas',
    href: '/contact',
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Planes simples y transparentes</h2>
          <p className="text-slate-400">Sin costos ocultos. Cancela cuando quieras.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? 'bg-primary/10 border-2 border-primary gradient-border glow-primary'
                  : 'bg-bg-surface border border-bg-border'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                  MÁS POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-white mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-slate-500 mb-1">{plan.period}</span>
                </div>
                <p className="text-sm text-slate-400 mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-accent text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block text-center font-semibold py-3 rounded-xl transition-all ${
                  plan.highlight
                    ? 'bg-primary hover:bg-primary-hover text-white glow-primary'
                    : 'border border-bg-border hover:border-primary/50 text-slate-300 hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
