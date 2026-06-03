'use client';

import { useEffect, useRef, useState } from 'react';
import { Smartphone, ShoppingBag, BarChart3, Zap } from 'lucide-react';
import styles from './ProductShowcase.module.css';

const features = [
  {
    icon: Smartphone,
    title: 'Menú digital premium',
    description: 'Tu menú completo, con fotos, categorías y precios actualizados en tiempo real.',
  },
  {
    icon: ShoppingBag,
    title: 'Pedidos instantáneos',
    description: 'Tus clientes piden directo desde el celular. Sin apps, sin descargas, sin fricción.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard inteligente',
    description: 'Controla pedidos, gestiona tu menú y analiza ventas — todo desde un solo lugar.',
  },
  {
    icon: Zap,
    title: 'Listo en minutos',
    description: 'Configura tu restaurante, sube tu menú y comparte tu link. Sin código, sin complicaciones.',
  },
];

export function ProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${visible ? styles.visible : ''}`}
      id="producto"
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>El producto</span>
          <h2 className={styles.title}>
            Todo lo que necesitas para{' '}
            <span className="gradient-text">digitalizar</span> tu restaurante
          </h2>
          <p className={styles.subtitle}>
            Una plataforma completa que reemplaza el menú de papel, los pedidos por WhatsApp
            y las hojas de Excel.
          </p>
        </div>

        {/* Phone mockup with menu preview */}
        <div className={styles.showcase}>
          <div className={styles.phoneMockup}>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneScreen}>
                {/* Mini menu preview */}
                <div className={styles.miniHeader}>
                  <div className={styles.miniCover} style={{ backgroundImage: "url('/images/restaurant_cover.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className={styles.miniInfo}>
                    <div className={styles.miniName}>La Terraza Dorada</div>
                    <div className={styles.miniMeta}>⭐ 4.8 • Cocina contemporánea</div>
                  </div>
                </div>
                <div className={styles.miniCategories}>
                  <span className={styles.miniCatActive}>🔥 Popular</span>
                  <span className={styles.miniCat}>🍖 Fuertes</span>
                  <span className={styles.miniCat}>🍕 Pizzas</span>
                </div>
                <div className={styles.miniItems}>
                  <div className={styles.miniItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/bowl_teriyaki.png" alt="Bowl Teriyaki" className={styles.miniItemImg} />
                    <div className={styles.miniItemInfo}>
                      <div className={styles.miniItemName}>Bowl Teriyaki</div>
                      <div className={styles.miniItemPrice}>$32.900</div>
                    </div>
                    <div className={styles.miniItemAdd}>+</div>
                  </div>
                  <div className={styles.miniItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/burger_smash.png" alt="Burger Smash" className={styles.miniItemImg} />
                    <div className={styles.miniItemInfo}>
                      <div className={styles.miniItemName}>Burger Smash</div>
                      <div className={styles.miniItemPrice}>$38.900</div>
                    </div>
                    <div className={styles.miniItemAdd}>+</div>
                  </div>
                  <div className={styles.miniItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/lomo_steak.png" alt="Lomo en Costra" className={styles.miniItemImg} />
                    <div className={styles.miniItemInfo}>
                      <div className={styles.miniItemName}>Lomo en Costra</div>
                      <div className={styles.miniItemPrice}>$54.900</div>
                    </div>
                    <div className={styles.miniItemAdd}>+</div>
                  </div>
                </div>
                <div className={styles.miniCart}>
                  🛒 Ver carrito (2) — $71.800
                </div>
              </div>
            </div>
          </div>

          <div className={styles.featureGrid}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={styles.featureCard}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={styles.featureIcon}>
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDesc}>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
