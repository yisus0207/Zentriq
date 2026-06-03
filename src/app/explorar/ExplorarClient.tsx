'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MapPin, LayoutGrid, Search, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { RestaurantMap } from '@/components/landing/RestaurantMap/RestaurantMap';
import Link from 'next/link';
import styles from './explorar.module.css';

export function ExplorarClient() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('restaurants')
          .select(`
            id,
            name,
            public_slug,
            logo_url,
            cover_url,
            description,
            restaurant_locations (
              id,
              name,
              address,
              city,
              latitude,
              longitude
            )
          `)
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

  // Helper matching functions for dynamic categorization
  const matchesCategory = (r: any, category: string) => {
    if (category === 'all') return true;
    const textToMatch = `${r.name} ${r.description || ''}`.toLowerCase();
    
    if (category === 'burgers') {
      return textToMatch.includes('hamburguesa') || textToMatch.includes('burger') || textToMatch.includes('smash') || textToMatch.includes('perro');
    }
    if (category === 'pizzas') {
      return textToMatch.includes('pizza') || textToMatch.includes('pizzería') || textToMatch.includes('pizzeria') || textToMatch.includes('italiana');
    }
    if (category === 'sushi') {
      return textToMatch.includes('sushi') || textToMatch.includes('asiática') || textToMatch.includes('asiatico') || textToMatch.includes('teriyaki') || textToMatch.includes('ramen') || textToMatch.includes('wok');
    }
    if (category === 'healthy') {
      return textToMatch.includes('saludable') || textToMatch.includes('fit') || textToMatch.includes('ensalada') || textToMatch.includes('vegetariano') || textToMatch.includes('vegano') || textToMatch.includes('bowl');
    }
    if (category === 'coffee') {
      return textToMatch.includes('café') || textToMatch.includes('cafe') || textToMatch.includes('postre') || textToMatch.includes('pastelería') || textToMatch.includes('pasteleria') || textToMatch.includes('dulce') || textToMatch.includes('helado');
    }
    if (category === 'others') {
      const categories = ['hamburguesa', 'burger', 'smash', 'perro', 'pizza', 'pizzería', 'pizzeria', 'italiana', 'sushi', 'asiática', 'asiatico', 'teriyaki', 'ramen', 'wok', 'saludable', 'fit', 'ensalada', 'vegetariano', 'vegano', 'bowl', 'café', 'cafe', 'postre', 'pastelería', 'pasteleria', 'dulce', 'helado'];
      return !categories.some(cat => textToMatch.includes(cat));
    }
    return true;
  };

  const matchesZone = (r: any, zone: string) => {
    if (zone === 'all') return true;
    
    const locations = r.restaurant_locations || [];
    if (locations.length === 0) return zone === 'all';

    const addressesText = locations.map((loc: any) => `${loc.name} ${loc.address}`).join(' ').toLowerCase();

    if (zone === 'norte') {
      return addressesText.includes('norte') || addressesText.includes('buenavista') || addressesText.includes('riomar') || addressesText.includes('villa santos') || addressesText.includes('altamira');
    }
    if (zone === 'centro_prado') {
      return addressesText.includes('alto prado') || addressesText.includes('prado') || addressesText.includes('centro') || addressesText.includes('el golf');
    }
    if (zone === 'sur') {
      return addressesText.includes('sur') || addressesText.includes('metropolitana') || addressesText.includes('soledad');
    }
    return true;
  };

  // Perform full filtering
  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.restaurant_locations && r.restaurant_locations.some((loc: any) => loc.address.toLowerCase().includes(searchQuery.toLowerCase())));
      
    return matchesSearch && matchesCategory(r, selectedCategory) && matchesZone(r, selectedZone);
  });

  // Extract filtered locations for the map
  const filteredLocations = filteredRestaurants.flatMap(r => 
    (r.restaurant_locations || []).map((loc: any) => ({
      id: loc.id,
      restaurant_id: r.id,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address,
      restaurants: {
        name: r.name,
        public_slug: r.public_slug,
        logo_url: r.logo_url,
        description: r.description
      }
    }))
  );

  const categories = [
    { id: 'all', label: 'Todos', icon: '🍽️' },
    { id: 'burgers', label: 'Burgers', icon: '🍔' },
    { id: 'pizzas', label: 'Pizzas', icon: '🍕' },
    { id: 'sushi', label: 'Sushi & Wok', icon: '🍣' },
    { id: 'healthy', label: 'Saludable', icon: '🥗' },
    { id: 'coffee', label: 'Café & Postres', icon: '☕' },
    { id: 'others', label: 'Otros', icon: '✨' },
  ];

  const zones = [
    { id: 'all', label: 'Todas las zonas' },
    { id: 'norte', label: 'Zona Norte' },
    { id: 'centro_prado', label: 'Centro / Prado' },
    { id: 'sur', label: 'Zona Sur / Soledad' },
  ];

  return (
    <div className={styles.container}>
      {/* Floating Toggle View Button */}
      <button 
        className={styles.floatingToggle}
        onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
      >
        {viewMode === 'list' ? (
          <>
            <MapPin size={18} /> <span>Ver Mapa</span>
          </>
        ) : (
          <>
            <LayoutGrid size={18} /> <span>Ver Lista</span>
          </>
        )}
      </button>

      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Descubre Restaurantes</h1>
          <p className={styles.subtitle}>Pide directo, sin comisiones ocultas.</p>
          
          <div className={styles.controlsRow}>
            <div className={styles.searchBar}>
              <Search size={20} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Buscar por nombre, comida o dirección..." 
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
              className={`${styles.filterToggleBtn} ${showFilters ? styles.filterToggleActive : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={18} />
              <span className={styles.filterToggleText}>Filtros</span>
              {(selectedCategory !== 'all' || selectedZone !== 'all') && (
                <span className={styles.activeFiltersIndicator} />
              )}
            </button>
          </div>

          {/* Premium Filter Section (Collapsible) */}
          <div className={`${styles.filterSection} ${showFilters ? styles.filterSectionOpen : ''}`}>
            <div className={styles.filterGroup}>
              <div className={styles.chipsContainer}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`${styles.chip} ${selectedCategory === cat.id ? styles.chipActive : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span className={styles.chipIcon}>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.chipsContainer}>
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    className={`${styles.chip} ${selectedZone === zone.id ? styles.chipActive : ''}`}
                    onClick={() => setSelectedZone(zone.id)}
                  >
                    <span>{zone.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {viewMode === 'map' ? (
          <div className={styles.mapWrapper}>
            <RestaurantMap locations={filteredLocations} isLoading={isLoading} />
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
                      
                      {restaurant.restaurant_locations && restaurant.restaurant_locations.length > 0 && (
                        <div className={styles.locationTags}>
                          {restaurant.restaurant_locations.slice(0, 2).map((loc: any) => (
                            <span key={loc.id} className={styles.locationTag}>
                              <MapPin size={10} /> {loc.name || loc.address}
                            </span>
                          ))}
                          {restaurant.restaurant_locations.length > 2 && (
                            <span className={styles.locationTag}>+{restaurant.restaurant_locations.length - 2}</span>
                          )}
                        </div>
                      )}

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
