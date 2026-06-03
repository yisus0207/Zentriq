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

export function RestaurantMap() {
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const supabase = createClient();
        
        // Fetch locations joined with public_restaurants view equivalent
        const { data, error } = await supabase
          .from('restaurant_locations')
          .select(`
            id,
            restaurant_id,
            name,
            latitude,
            longitude,
            address,
            restaurants!inner(
              name,
              public_slug,
              logo_url,
              description,
              is_active,
              is_public
            )
          `)
          .eq('restaurants.is_active', true)
          .eq('restaurants.is_public', true);

        if (error) throw error;
        
        if (data) {
          setLocations(data);
        }
      } catch (err) {
        console.error('Error fetching map locations:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocations();
  }, []);

  return (
    <section id="explorar" className={styles.mapSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <MapPin size={16} /> Explorar
          </div>
          <h2 className={styles.title}>Encuentra restaurantes cerca de ti</h2>
          <p className={styles.subtitle}>
            Descubre los mejores menús interactivos de tu ciudad y pide en segundos directamente a su WhatsApp.
          </p>
        </div>

        <div className={styles.mapContainer}>
          <DynamicMap locations={locations} />
        </div>
      </div>
    </section>
  );
}
