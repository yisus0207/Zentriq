'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, MapPin, Sparkles, HelpCircle, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { branding } from '@/config/branding';
import styles from './Navbar.module.css';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Explorar', href: '/explorar', icon: <MapPin size={18} /> },
    { name: 'Producto', href: '/#producto', icon: <Sparkles size={18} /> },
    { name: 'Cómo funciona', href: '/#como-funciona', icon: <HelpCircle size={18} /> },
    { name: 'Precios', href: '/#precios', icon: <CreditCard size={18} /> },
  ];

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo} onClick={() => setMobileMenuOpen(false)}>
            <div className={styles.logoMark}>
              {branding.name.charAt(0)}
            </div>
            <span className={styles.logoText}>{branding.name}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className={styles.desktopNav}>
            <ul className={styles.navItems}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.navLink}>
                    {link.icon && <span className={styles.linkIcon}>{link.icon}</span>}
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <Link href="/auth/login" className={styles.loginBtn}>
              Iniciar sesión
            </Link>
            <Link href="/auth/register" className={styles.ctaBtn}>
              Empezar gratis
            </Link>
            
            {/* Mobile Menu Toggle */}
            <button 
              className={styles.menuToggle} 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className={styles.mobileMenu}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.mobileMenuTitle}>MENÚ DE NAVEGACIÓN</div>

            <div className={styles.mobileNavItems}>
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.icon && <span className={styles.linkIcon}>{link.icon}</span>}
                  {link.name}
                </Link>
              ))}
              <div className={styles.mobileActions}>
                <Link 
                  href="/auth/login" 
                  className={styles.mobileLoginBtn}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Iniciar sesión
                </Link>
                <Link 
                  href="/auth/register" 
                  className={styles.mobileCtaBtn}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Empezar gratis
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
