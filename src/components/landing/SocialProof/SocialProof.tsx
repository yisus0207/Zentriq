'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SocialProof.module.css';

const stats = [
  { value: '200+', label: 'Restaurantes activos' },
  { value: '50K+', label: 'Pedidos procesados' },
  { value: '4.9', label: 'Calificación promedio' },
  { value: '< 30s', label: 'Tiempo de carga' },
];

const logos = [
  'La Terraza', 'El Rincón', 'Sazón Urbano', 'Casa Madre',
  'Punto & Coma', 'Verde Lima', 'El Establo', 'Nómada',
  'Bambú', 'La Barra', 'Fogón', 'Origen',
];

export function SocialProof() {
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
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.section} ${visible ? styles.visible : ''}`}
    >
      <div className={styles.container}>
        {/* Stats row */}
        <div className={styles.stats}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Trust text */}
        <p className={styles.trustText}>
          Empresas que confían en nuestra plataforma
        </p>

        {/* Logo marquee */}
        <div className={styles.marqueeContainer}>
          <div className={styles.marquee}>
            {[...logos, ...logos].map((name, i) => (
              <div key={`${name}-${i}`} className={styles.logoItem}>
                <div className={styles.logoPlaceholder}>
                  {name.charAt(0)}
                </div>
                <span className={styles.logoName}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
