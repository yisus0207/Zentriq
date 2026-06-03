import Link from 'next/link';
import { branding } from '@/config/branding';
import styles from './Footer.module.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoMark}>{branding.name.charAt(0)}</span>
              <span className={styles.logoText}>{branding.name}</span>
            </Link>
            <p className={styles.brandDesc}>{branding.tagline}</p>
          </div>

          <div className={styles.links}>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Producto</h4>
              <a href="#producto" className={styles.link}>Características</a>
              <a href="#como-funciona" className={styles.link}>Cómo funciona</a>
              <Link href="/r/la-terraza-dorada" className={styles.link}>Demo</Link>
            </div>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Empresa</h4>
              <a href="#" className={styles.link}>Acerca de</a>
              <a href="#" className={styles.link}>Blog</a>
              <a href="#" className={styles.link}>Contacto</a>
            </div>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Legal</h4>
              <a href="#" className={styles.link}>Privacidad</a>
              <a href="#" className={styles.link}>Términos</a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {currentYear} {branding.name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
