import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-bg-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">CF</span>
          <span className="font-semibold text-white">CashFlow</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#how" className="hover:text-white transition-colors">Cómo funciona</a>
          <a href="#security" className="hover:text-white transition-colors">Seguridad</a>
          <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors"
          >
            Empezar gratis
          </Link>
        </div>
      </div>
    </nav>
  );
}
