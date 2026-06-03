import Link from 'next/link';
import { branding } from '@/config/branding';
import styles from './HeroSection.module.css';

export function HeroSection() {
  return (
    <section className={styles.hero} id="hero">
      {/* Animated mesh background */}
      <div className={styles.meshBg} aria-hidden="true">
        <div className={`${styles.meshOrb} ${styles.meshOrb1}`} />
        <div className={`${styles.meshOrb} ${styles.meshOrb2}`} />
        <div className={`${styles.meshOrb} ${styles.meshOrb3}`} />
      </div>

      {/* Noise overlay */}
      <div className={styles.noiseOverlay} aria-hidden="true" />

      {/* Content */}
      <div className={styles.heroContent}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Nuevo — Menús digitales con IA
        </div>

        <h1 className={styles.headline}>
          Tu restaurante,{' '}
          <span className={styles.headlineAccent}>en el bolsillo</span>{' '}
          de cada cliente
        </h1>

        <p className={styles.subheadline}>
          {branding.description}. Menú digital, pedidos en tiempo real
          y gestión inteligente — todo en una plataforma.
        </p>

        <div className={styles.heroCtas}>
          <Link href="/auth/register">
            <button className={styles.primaryCta}>
              Empezar gratis →
            </button>
          </Link>
          <Link href="/r/la-terraza-dorada">
            <button className={styles.secondaryCta}>
              Ver demo
            </button>
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={styles.scrollIndicator} aria-hidden="true">
        <span>Descubre más</span>
        <div className={styles.scrollLine} />
      </div>
    </section>
  );
}
