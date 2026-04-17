const CONTROLS = [
  { icon: '🔑', title: 'Argon2id', desc: 'Hashing de contraseñas resistente a GPU (m=64MB, t=3, p=4).' },
  { icon: '🎫', title: 'JWT + Refresh Tokens', desc: 'Tokens de acceso de 15 min. Refresh tokens rotados y almacenados como SHA-256.' },
  { icon: '🗄️', title: 'Row-Level Security', desc: 'PostgreSQL RLS: tus datos son inaccesibles a nivel de base de datos para otros usuarios.' },
  { icon: '🛡️', title: 'Rate Limiting', desc: '5 req/min en endpoints de auth. Bloqueo automático tras 5 intentos fallidos.' },
  { icon: '🆔', title: 'UUID v4 como PKs', desc: 'IDs no secuenciales ni predecibles. Ataques IDOR son estructuralmente imposibles.' },
  { icon: '💉', title: 'Sin SQL Raw', desc: 'SQLAlchemy ORM parameterizado en 100% de las queries. Sin inyecciones posibles.' },
  { icon: '🚫', title: 'Anti-enumeración', desc: 'Login y registro devuelven mensajes idénticos. Imposible inferir si un email existe.' },
  { icon: '⏱️', title: 'Timing-safe', desc: 'verify_password se ejecuta siempre, incluso si el usuario no existe.' },
];

export default function Security() {
  return (
    <section id="security" className="py-24 px-6 bg-bg-surface/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Seguridad de <span className="gradient-text">nivel producción</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Cada endpoint fue diseñado como superficie de ataque. Auditado para resistir OWASP Top 10.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTROLS.map((c, i) => (
            <div
              key={i}
              className="bg-bg border border-bg-border rounded-xl p-4 hover:border-accent/30 transition-colors"
            >
              <div className="text-2xl mb-3">{c.icon}</div>
              <div className="text-sm font-semibold text-white mb-1">{c.title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
