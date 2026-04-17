import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Security from '@/components/landing/Security';
import Pricing from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-slate-100 overflow-x-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Security />
      <Pricing />

      <footer className="border-t border-bg-border py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} CashFlow · Tus datos son tuyos.
      </footer>
    </main>
  );
}
