/**
 * Branding Configuration
 * 
 * ALL brand references must use this config.
 * NEVER hardcode "Zentriq" or any brand name in components.
 * The brand name is temporary and will change in the future.
 */

export const branding = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Zentriq',
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'La plataforma inteligente para restaurantes modernos',
  tagline:
    process.env.NEXT_PUBLIC_APP_TAGLINE ||
    'Tu restaurante, en el bolsillo de cada cliente',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://zentriq.app',

  seo: {
    title: `${process.env.NEXT_PUBLIC_APP_NAME || 'Zentriq'} — Menú digital y pedidos para restaurantes`,
    description:
      'Crea tu menú digital, recibe pedidos y gestiona tu restaurante desde una sola plataforma.',
    ogImage: '/og-image.png',
  },

  support: {
    email: 'hello@zentriq.app',
    whatsapp: '',
  },

  social: {
    instagram: '',
    twitter: '',
  },
} as const;

export type Branding = typeof branding;
