import { Navbar } from '@/components/landing/Navbar/Navbar';
import { HeroSection } from '@/components/landing/HeroSection/HeroSection';
import { ProductShowcase } from '@/components/landing/ProductShowcase/ProductShowcase';
import { SocialProof } from '@/components/landing/SocialProof/SocialProof';
import { CTASection } from '@/components/landing/CTASection/CTASection';
import { Footer } from '@/components/landing/Footer/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProductShowcase />
        <SocialProof />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
