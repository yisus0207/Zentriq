import { Navbar } from '@/components/landing/Navbar/Navbar';
import { Footer } from '@/components/landing/Footer/Footer';
import { ExplorarClient } from './ExplorarClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explorar Restaurantes | Zentriq',
  description: 'Descubre los mejores restaurantes cerca de ti y pide directo a su WhatsApp.',
};

export default function ExplorarPage() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', paddingTop: '80px', background: 'var(--color-bg)' }}>
        <ExplorarClient />
      </main>
      <Footer />
    </>
  );
}
