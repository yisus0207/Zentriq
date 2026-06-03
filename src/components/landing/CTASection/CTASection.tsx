'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { branding } from '@/config/branding';
import styles from './CTASection.module.css';

export function CTASection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.section} ${visible ? styles.visible : ''}`}
    >
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <h2 className={styles.title}>
          ¿Listo para transformar tu restaurante?
        </h2>
        <p className={styles.subtitle}>
          Únete a cientos de restaurantes que ya usan {branding.name} para
          crecer. Empieza gratis, sin tarjeta de crédito.
        </p>
        <div className={styles.actions}>
          <Link href="/auth/register">
            <button className={styles.ctaButton}>
              Crear mi menú gratis
              <ArrowRight size={18} />
            </button>
          </Link>
          <p className={styles.ctaNote}>
            Setup en menos de 5 minutos • Sin compromiso
          </p>
        </div>
      </div>
    </section>
  );
}
