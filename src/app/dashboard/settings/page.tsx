'use client';

import { useState, useEffect } from 'react';
import { Save, Check, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { demoRestaurant } from '@/lib/demo-data';
import styles from './settings.module.css';

export default function SettingsPage() {
  const [restaurantName, setRestaurantName] = useState(demoRestaurant.name);
  const [description, setDescription] = useState(demoRestaurant.description || '');
  const [slug, setSlug] = useState(demoRestaurant.slug);
  const [phone, setPhone] = useState(demoRestaurant.phone || '');
  const [address, setAddress] = useState(demoRestaurant.address || '');
  const [currency, setCurrency] = useState(demoRestaurant.currency);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // 1. Get user session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // 2. Get restaurant membership
        const { data: member } = await supabase
          .from('restaurant_members')
          .select('restaurant_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!member) {
          setIsLoading(false);
          return;
        }

        setRestaurantId(member.restaurant_id);

        // 3. Get restaurant details
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', member.restaurant_id)
          .single();

        if (restaurant) {
          setRestaurantName(restaurant.name);
          setDescription(restaurant.description || '');
          setSlug(restaurant.public_slug);
          setPhone(restaurant.phone || '');
        }

        // 4. Get primary location address
        const { data: location } = await supabase
          .from('restaurant_locations')
          .select('address')
          .eq('restaurant_id', member.restaurant_id)
          .eq('is_primary', true)
          .maybeSingle();

        if (location) {
          setAddress(location.address);
        }

        // 5. Get settings
        const { data: settings } = await supabase
          .from('restaurant_settings')
          .select('currency')
          .eq('restaurant_id', member.restaurant_id)
          .maybeSingle();

        if (settings) {
          setCurrency(settings.currency || 'COP');
        }
      } catch (err) {
        console.error('Error loading settings from Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantName || !slug) return;

    setIsSaving(true);
    setSaveSuccess(false);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !restaurantId) {
      // Mock network save fallback
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }, 1200);
      return;
    }

    try {
      const supabase = createClient();

      // 1. Update restaurant details
      const { error: rError } = await supabase
        .from('restaurants')
        .update({
          name: restaurantName,
          public_slug: slug,
          description: description || null,
          phone: phone || null,
        })
        .eq('id', restaurantId);

      if (rError) throw rError;

      // 2. Update/Insert primary location
      const { data: existingLocation } = await supabase
        .from('restaurant_locations')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('is_primary', true)
        .maybeSingle();

      if (existingLocation) {
        await supabase
          .from('restaurant_locations')
          .update({
            address: address,
          })
          .eq('id', existingLocation.id);
      } else {
        await supabase
          .from('restaurant_locations')
          .insert({
            restaurant_id: restaurantId,
            name: 'Sede Principal',
            address: address,
            city: 'Principal',
            country: 'Colombia',
            latitude: 0,
            longitude: 0,
            is_primary: true,
          });
      }

      // 3. Update settings currency
      await supabase
        .from('restaurant_settings')
        .upsert({
          restaurant_id: restaurantId,
          currency: currency,
        }, { onConflict: 'restaurant_id' });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving settings to Supabase:', err);
      alert('Hubo un error al guardar los datos en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.settingsContainer}>
        <div className={styles.settingsCard} style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Cargando configuración de la base de datos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <form onSubmit={handleSave} className={styles.settingsCard}>
        <h2 className={styles.cardTitle}>Información del Restaurante</h2>

        {/* Name */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Nombre Comercial</label>
          <input
            type="text"
            required
            className={styles.formInput}
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Ej. La Terraza Dorada"
          />
        </div>

        {/* Slug / Public URL */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Ruta del Menú Digital</label>
          <div className={styles.slugWrapper}>
            <span className={styles.slugPrefix}>zentriq.app/r/</span>
            <input
              type="text"
              required
              className={`${styles.formInput} ${styles.slugInput}`}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
              placeholder="nombre-restaurante"
            />
          </div>
          <span className={styles.helperText}>
            Esta es la URL pública que tus clientes escanearán (ej. códigos QR). Solo letras, números, guiones.
          </span>
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Descripción Corta</label>
          <textarea
            className={styles.formInput}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe tu propuesta culinaria, horarios, etc. Se mostrará en el encabezado de tu menú."
          />
        </div>

        {/* Phone & Address */}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Teléfono para Pedidos</label>
            <input
              type="tel"
              className={styles.formInput}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. +57 300 123 4567"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Dirección física</label>
            <input
              type="text"
              className={styles.formInput}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej. Calle 10 #43-12, Medellín"
            />
          </div>
        </div>

        {/* Currency selection */}
        <div className={styles.formRow} style={{ gridTemplateColumns: '1fr' }}>
          <div className={styles.formGroup} style={{ maxWidth: '300px' }}>
            <label className={styles.formLabel}>Moneda de Visualización</label>
            <select
              className={styles.formInput}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="COP">COP ($) — Peso Colombiano</option>
              <option value="USD">USD ($) — Dólar Americano</option>
              <option value="MXN">MXN ($) — Peso Mexicano</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="CLP">CLP ($) — Peso Chileno</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className={`${styles.saveButton} ${saveSuccess ? styles.saveButtonActive : ''}`}
        >
          {isSaving ? (
            <span>Guardando...</span>
          ) : saveSuccess ? (
            <>
              <Check size={16} strokeWidth={3} />
              <span>¡Guardado!</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </form>

      {/* Integration Card */}
      <div className={styles.settingsCard}>
        <h2 className={styles.cardTitle}>Integración y Códigos QR</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Tu menú digital está disponible en internet para cualquier dispositivo. Puedes descargar tu código QR oficial para imprimirlo y ponerlo en tus mesas.
        </p>

        <div
          style={{
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'var(--color-primary-muted)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Globe size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                URL PÚBLICA DE TU MENÚ
              </span>
              <a
                href={`/r/${slug}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--color-primary)' }}
              >
                zentriq.app/r/{slug}
              </a>
            </div>
          </div>

          <a
            href={`/r/${slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--color-text)',
              fontSize: 'var(--text-xs)',
              fontWeight: '600',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            Ver Menú
          </a>
        </div>
      </div>
    </div>
  );
}
