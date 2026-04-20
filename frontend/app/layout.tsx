import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CashFlow — Controla tu dinero con tu voz',
  description: 'Gestión financiera personal con inteligencia artificial. Registra tus movimientos hablando o escribiendo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
