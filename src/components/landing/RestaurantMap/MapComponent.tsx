'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';

// Fix Leaflet's default icon path issues with Webpack/Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

// Component to handle auto-centering if locations change
function MapAutoCenter({ locations }: { locations: RestaurantLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);
  return null;
}

export default function MapComponent({ locations }: { locations: RestaurantLocation[] }) {
  // Default to Medellin coordinates if no locations
  const defaultCenter: [number, number] = [6.2442, -75.5812];

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '16px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map((loc) => (
          <Marker 
            key={loc.id} 
            position={[loc.latitude, loc.longitude]} 
            icon={customIcon}
          >
            <Popup className="restaurant-popup">
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#1a1a1a' }}>
                  {loc.restaurants?.name}
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.9rem' }}>
                  {loc.address}
                </p>
                <Link 
                  href={`/r/${loc.restaurants?.public_slug}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '50px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  Ver menú <ExternalLink size={16} />
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapAutoCenter locations={locations} />
      </MapContainer>
    </div>
  );
}
