const FEATURES = [
  {
    icon: '🧠',
    title: 'NLP en español',
    description: 'Entiende lenguaje natural: montos, fechas relativas, cuentas y categorías sin configuración previa.',
  },
  {
    icon: '⚡',
    title: 'Registro instantáneo',
    description: 'De texto a transacción validada en menos de un segundo. Sin pasos intermedios.',
  },
  {
    icon: '🏦',
    title: 'Multi-cuenta',
    description: 'Administra efectivo, banco, tarjeta o cripto desde un solo lugar con saldos en tiempo real.',
  },
  {
    icon: '📈',
    title: 'Reportes visuales',
    description: 'Gráficos de tendencias, distribución por categoría y comparativa mensual listos sin configurar nada.',
  },
  {
    icon: '🎯',
    title: 'Presupuestos',
    description: 'Define límites por categoría y recibe alertas antes de excederlos.',
  },
  {
    icon: '🔒',
    title: 'Privacidad total',
    description: 'Argon2id + JWT + Row-Level Security. Tus datos nunca se mezclan con los de otros usuarios.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-light mb-3 opacity-80">
            Funciones
          </span>
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Todo lo que necesitas,{' '}
            <span className="gradient-text">nada de lo que no</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Construido para que el registro de gastos deje de ser una tarea y se vuelva algo natural.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group bg-bg-surface border border-bg-border rounded-2xl p-6 hover:border-primary/40 hover:bg-bg-elevated transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
