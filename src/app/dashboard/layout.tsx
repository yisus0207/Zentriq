'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react';
import { branding } from '@/config/branding';
import styles from './dashboard.module.css';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/dashboard/menu', icon: UtensilsCrossed, label: 'Menú' },
  { href: '/dashboard/orders', icon: ClipboardList, label: 'Pedidos' },
  { href: '/dashboard/settings', icon: Settings, label: 'Ajustes' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className={styles.layout}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarLogo}>
          <span className={styles.logoMark}>{branding.name.charAt(0)}</span>
        </Link>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.sidebarItem} ${
                  isActive(item.href) ? styles.sidebarItemActive : ''
                }`}
                title={item.label}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className={styles.sidebarLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link href="/" className={styles.sidebarItem} title="Cerrar sesión">
            <LogOut size={20} strokeWidth={1.8} />
            <span className={styles.sidebarLabel}>Salir</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Top bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <h1 className={styles.pageTitle}>
              {navItems.find((i) => isActive(i.href))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.avatar}>
              <span>LT</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className={styles.content}>{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className={styles.bottomNav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.bottomNavItem} ${
                isActive(item.href) ? styles.bottomNavItemActive : ''
              }`}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className={styles.bottomNavLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
