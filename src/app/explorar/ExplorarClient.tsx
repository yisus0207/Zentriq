'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MapPin, LayoutGrid, Search, ArrowRight } from 'lucide-react';
import { RestaurantMap } from '@/components/landing/RestaurantMap/RestaurantMap';
import Link from 'next/link';
import styles from './explorar.module.css';

export function ExplorarClient() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name, public_slug, logo_url, cover_url, description')
          .eq('is_active', true)
          .eq('is_public', true)
          .is('deleted_at', null);

        if (error) throw error;
        if (data) setRestaurants(data);
      } catch (err) {
        console.error('Error fetching restaurants:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRestaurants();
  }, []);

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Descubre Restaurantes</h1>
          <p className={styles.subtitle}>Pide directo, sin comisiones ocultas.</p>
          
          <div className={styles.controls}>
            <div className={styles.searchBar}>
              <Search size={20} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Buscar por nombre, comida..." 
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className={styles.toggleGroup}>
              <button 
                className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
              >
                <LayoutGrid size={18} /> Lista
              </button>
              <button 
                className={`${styles.toggleBtn} ${viewMode === 'map' ? styles.active : ''}`}
                onClick={() => setViewMode('map')}
              >
                <MapPin size={18} /> Mapa
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {viewMode === 'map' ? (
          <div className={styles.mapWrapper}>
            <RestaurantMap />
          </div>
        ) : (
          <>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Cargando restaurantes...</p>
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No se encontraron restaurantes.</p>
              </div>
            ) : (
                <div className={styles.grid}>
                {filteredRestaurants.map(restaurant => (
                  <Link key={restaurant.id} href={`/r/${restaurant.public_slug}`} className={styles.card}>
                    <div 
                      className={styles.cover}
                      style={{ backgroundImage: `url(${restaurant.cover_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000'})` }}
                    />
                    <div className={styles.cardBody}>
                      <div className={styles.logoWrapper}>
                        {restaurant.logo_url ? (
                          <img src={restaurant.logo_url} alt={restaurant.name} className={styles.logo} />
                        ) : (
                          <div className={styles.logoPlaceholder}>{restaurant.name.charAt(0)}</div>
                        )}
                      </div>
                      <h3 className={styles.cardTitle}>{restaurant.name}</h3>
                      <p className={styles.cardDesc}>{restaurant.description || 'Restaurante asociado a Zentriq.'}</p>
                      <div className={styles.cardFooter}>
                        <span className={styles.actionText}>Ver menú <ArrowRight size={16} /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
