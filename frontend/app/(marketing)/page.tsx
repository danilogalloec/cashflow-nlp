import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import CTA from '@/components/landing/CTA';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-slate-100 overflow-x-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <CTA />

      <footer className="border-t border-bg-border py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} CashFlow · Tus datos son tuyos.
      </footer>
    </main>
  );
}
