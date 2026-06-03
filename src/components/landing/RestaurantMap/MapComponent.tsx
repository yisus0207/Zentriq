'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/navigation';

// Configure the token
if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
}

type RestaurantLocation = {
  id: string;
  restaurant_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  restaurants: {
    name: string;
    public_slug: string;
    logo_url: string;
    description: string;
  };
};

export default function MapComponent({ locations }: { locations: RestaurantLocation[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const isInteracting = useRef(false);
  const router = useRouter();

  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
 
  // 1. Initialize map once
  useEffect(() => {
    if (!mapContainer.current || !mapboxgl.accessToken || map.current) return;
 
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-74.7813, 10.9685], // Barranquilla
      zoom: 12,
      pitch: 60, // 3D angle
      bearing: 0,
      attributionControl: false,
      logoPosition: 'bottom-left'
    });
 
    const pauseRotation = () => { isInteracting.current = true; };
    const resumeRotation = () => { setTimeout(() => { isInteracting.current = false; }, 2000); };
 
    map.current.on('mousedown', pauseRotation);
    map.current.on('touchstart', pauseRotation);
    map.current.on('wheel', pauseRotation);
    map.current.on('mouseup', resumeRotation);
    map.current.on('touchend', resumeRotation);
 
    function rotateCamera() {
      if (!isInteracting.current && map.current) {
        const currentBearing = map.current.getBearing();
        map.current.setBearing(currentBearing + 0.05); // Slow cinematic rotation
      }
      animationRef.current = requestAnimationFrame(rotateCamera);
    }
 
    map.current.on('load', () => {
      setMapLoaded(true);
      map.current?.resize();
      rotateCamera();
    });
 
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // 2. Update markers dynamically when locations change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers
    locations.forEach((loc) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';

      if (loc.restaurants?.logo_url) {
        el.style.backgroundImage = `url(${loc.restaurants.logo_url})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      } else {
        el.style.backgroundColor = '#10B981';
      }

      el.style.width = '40px';
      el.style.height = '40px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #10B981';
      el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.2s';

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const popupHtml = `
        <div style="text-align: center; padding: 0.5rem 0; color: #1a1a1a;">
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #1a1a1a; font-weight: bold;">
            ${loc.restaurants?.name}
          </h3>
          <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">
            ${loc.address}
          </p>
          <a href="/r/${loc.restaurants?.public_slug}" style="display: inline-flex; align-items: center; gap: 0.5rem; background: linear-gradient(135deg, #FF6B6B, #FF8E53); color: white; padding: 0.5rem 1rem; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 0.9rem;">
            Ver menú
          </a>
        </div>
      `;

      const popup = new mapboxgl.Popup({ 
        offset: 25, 
        closeButton: false, 
        className: 'dark-popup'
      }).setHTML(popupHtml);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);

      el.addEventListener('click', () => {
        isInteracting.current = true;
        map.current?.flyTo({
          center: [loc.longitude, loc.latitude],
          zoom: 14,
          essential: true
        });
        setTimeout(() => { isInteracting.current = false; }, 3000);
      });
    });
  }, [locations, mapLoaded]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', color: 'white', borderRadius: '16px' }}>
        <p>Token de Mapbox no configurado en .env.local</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style dangerouslySetInnerHTML={{
        __html: `
        .mapboxgl-popup-content {
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .mapboxgl-popup-tip {
          border-top-color: white !important;
        }
        /* Hides Mapbox watermark and attribution */
        .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right {
          display: none !important;
        }
      `}} />
    </div>
  );
}
