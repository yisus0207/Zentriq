'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { MapPin } from 'lucide-react';
import styles from './RestaurantMap.module.css';

// Dynamic import for Leaflet map to prevent SSR window/document not defined errors
const DynamicMap = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <div className={styles.spinner}></div>
      <p>Cargando mapa de restaurantes...</p>
    </div>
  ),
});

export function RestaurantMap({ locations, isLoading }: { locations: any[]; isLoading: boolean }) {
  return (
    <section id="explorar" className={styles.mapSection}>
      <div className={styles.container}>
        <div className={styles.mapContainer}>
          {isLoading ? (
            <div className={styles.mapLoading}>
              <div className={styles.spinner}></div>
              <p>Cargando mapa de restaurantes...</p>
            </div>
          ) : (
            <DynamicMap locations={locations} />
          )}
        </div>
      </div>
    </section>
  );
}
