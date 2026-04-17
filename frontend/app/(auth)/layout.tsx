import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      {/* Ambient glows */}
      <div className="fixed top-1/4 left-1/3 w-72 h-72 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/3 w-56 h-56 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
          CF
        </span>
        <span className="text-xl font-semibold text-white">CashFlow</span>
      </Link>

      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
