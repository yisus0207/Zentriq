'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { branding } from '@/config/branding';
import styles from './Navbar.module.css';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.logo} aria-label={`${branding.name} home`}>
          <span className={styles.logoMark}>
            {branding.name.charAt(0)}
          </span>
          <span>{branding.name}</span>
        </Link>

        <div className={styles.desktopLinks}>
          <a href="#producto" className={styles.navLink}>Producto</a>
          <a href="#como-funciona" className={styles.navLink}>Cómo funciona</a>
          <a href="#precios" className={styles.navLink}>Precios</a>
        </div>

        <div className={styles.navActions}>
          <Link href="/auth/login" className={`${styles.navLink} ${styles.loginBtn}`}>
            Iniciar sesión
          </Link>
          <Link href="/auth/register">
            <button className={styles.ctaBtn}>
              Empezar gratis
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
