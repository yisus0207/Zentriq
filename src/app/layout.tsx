import type { Metadata, Viewport } from 'next';
import { branding } from '@/config/branding';
import '@/styles/globals.css';
import '@/styles/animations.css';

export const metadata: Metadata = {
  title: {
    default: branding.seo.title,
    template: `%s — ${branding.name}`,
  },
  description: branding.seo.description,
  metadataBase: new URL(branding.url),
  openGraph: {
    title: branding.seo.title,
    description: branding.seo.description,
    siteName: branding.name,
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: branding.seo.title,
    description: branding.seo.description,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0F14',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
