'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Check, Globe, Download, Store, User, Megaphone, QrCode, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/supabase/storage';
import { QRCodeSVG } from 'qrcode.react';
import styles from './settings.module.css';

type TabId = 'restaurant' | 'account' | 'promotions' | 'qr';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('restaurant');

  // Restaurant Profile
  const [restaurantName, setRestaurantName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  // Account Profile
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  // Promotions
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerText, setBannerText] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // 1. Get user session & profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        if (profile) {
          setOwnerName(profile.full_name || '');
          setOwnerEmail(profile.email || user.email || '');
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
          setLogoUrl(restaurant.logo_url || '');
          setLogoPreview(restaurant.logo_url || '');
          setCoverUrl(restaurant.cover_url || '');
          setCoverPreview(restaurant.cover_url || '');
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
          .select('currency, banner_text, banner_active')
          .eq('restaurant_id', member.restaurant_id)
          .maybeSingle();

        if (settings) {
          setCurrency(settings.currency || 'COP');
          setBannerActive(settings.banner_active || false);
          setBannerText(settings.banner_text || '');
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
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }, 1200);
      return;
    }

    try {
      const supabase = createClient();
      
      let finalLogoUrl = logoUrl;
      let finalCoverUrl = coverUrl;
      
      // Upload new logo if selected
      if (logoFile) {
        const uploadedUrl = await uploadImage(logoFile, 'restaurant-media', `logos/${restaurantId}`);
        if (uploadedUrl) {
          finalLogoUrl = uploadedUrl;
          setLogoUrl(uploadedUrl);
        } else {
          alert('Error al subir el logo. Asegúrate de haber creado el bucket "restaurant-media" público en Supabase.');
        }
      }

      // Upload new cover if selected
      if (coverFile) {
        const uploadedUrl = await uploadImage(coverFile, 'restaurant-media', `covers/${restaurantId}`);
        if (uploadedUrl) {
          finalCoverUrl = uploadedUrl;
          setCoverUrl(uploadedUrl);
        } else {
          alert('Error al subir la portada.');
        }
      }

      // 1. Update restaurant details
      const { error: rError } = await supabase
        .from('restaurants')
        .update({
          name: restaurantName,
          description: description || null,
          phone: phone || null,
          logo_url: finalLogoUrl,
          cover_url: finalCoverUrl,
        })
        .eq('id', restaurantId);

      if (rError) throw rError;

      // 2. Update primary location
      const { data: existingLocation } = await supabase
        .from('restaurant_locations')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('is_primary', true)
        .maybeSingle();

      if (existingLocation) {
        await supabase
          .from('restaurant_locations')
          .update({ address: address })
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

      // 3. Update settings
      await supabase
        .from('restaurant_settings')
        .upsert({
          restaurant_id: restaurantId,
          currency: currency,
          banner_text: bannerText,
          banner_active: bannerActive,
        }, { onConflict: 'restaurant_id' });

      // 4. Update profile info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ full_name: ownerName })
          .eq('id', user.id);
      }

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

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw white background
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw SVG image
        ctx.drawImage(img, 0, 0);
      }

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${slug}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (isLoading) {
    return (
      <div className={styles.settingsContainer}>
        <div className={styles.settingsCard} style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const menuUrl = `https://zentriq.app/r/${slug}`; // Replace with your actual domain when deployed

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Ajustes de la Tienda</h1>
        <p className={styles.pageSubtitle}>Personaliza tu información y administra tu negocio.</p>
      </div>

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'restaurant' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('restaurant')}
        >
          <Store size={18} /> Restaurante
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'account' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <User size={18} /> Mi Cuenta
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'promotions' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('promotions')}
        >
          <Megaphone size={18} /> Promociones
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'qr' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('qr')}
        >
          <QrCode size={18} /> Código QR
        </button>
      </div>

      <form onSubmit={handleSave}>
        {activeTab === 'restaurant' && (
          <div className={styles.settingsCard}>
            <h2 className={styles.cardTitle}>Perfil del Restaurante</h2>
            
            <div style={{ marginBottom: 'var(--space-6)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              {/* Cover Photo */}
              <div style={{ position: 'relative', height: '160px', backgroundColor: 'var(--color-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="Cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                    <ImageIcon size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Foto de Portada</span>
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)', opacity: 0, transition: 'opacity 0.2s' }} 
                     onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                     onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', pointerEvents: 'none' }}>
                    Cambiar Portada
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleCoverChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                  title="Cambiar Portada"
                />
              </div>

              {/* Logo (Overlapping Cover) */}
              <div style={{ position: 'relative', padding: '0 var(--space-4) var(--space-4)' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-surface)', border: '4px solid var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, marginTop: '-40px', zIndex: 20 }}>
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={24} color="var(--color-text-muted)" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    title="Cambiar Logo"
                  />
                </div>
                <p className={styles.helperText} style={{ marginTop: '8px' }}>Sube tu logo (cuadrado) y foto de portada (rectangular) haciendo clic en las áreas correspondientes.</p>
              </div>
            </div>

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

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ruta del Menú Digital (No Modificable)</label>
              <div className={styles.slugWrapper}>
                <span className={styles.slugPrefix}>zentriq.app/r/</span>
                <input
                  type="text"
                  readOnly
                  className={`${styles.formInput} ${styles.slugInput}`}
                  value={slug}
                  style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }}
                />
              </div>
              <span className={styles.helperText}>
                Esta es tu URL pública actual. Para cambiarla, debes contactar a soporte.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descripción Corta</label>
              <textarea
                className={styles.formInput}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe tu propuesta culinaria, horarios, etc."
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Teléfono para Pedidos (WhatsApp)</label>
                <input
                  type="tel"
                  className={styles.formInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +573001234567"
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

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Moneda de Visualización</label>
              <select
                className={styles.formInput}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ maxWidth: '300px' }}
              >
                <option value="COP">COP ($) — Peso Colombiano</option>
                <option value="USD">USD ($) — Dólar Americano</option>
                <option value="MXN">MXN ($) — Peso Mexicano</option>
                <option value="EUR">EUR (€) — Euro</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className={styles.settingsCard}>
            <h2 className={styles.cardTitle}>Mi Cuenta</h2>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre del Administrador</label>
              <input
                type="text"
                className={styles.formInput}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Correo Electrónico (No Modificable)</label>
              <input
                type="email"
                readOnly
                className={styles.formInput}
                value={ownerEmail}
                style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }}
              />
            </div>
          </div>
        )}

        {activeTab === 'promotions' && (
          <div className={styles.settingsCard}>
            <h2 className={styles.cardTitle}>Banner Promocional</h2>
            <p className={styles.helperText} style={{ marginBottom: '1.5rem' }}>
              Muestra un anuncio llamativo en la parte superior de tu menú digital. Útil para anunciar descuentos generales, envíos gratis, u horarios festivos.
            </p>

            <div className={styles.toggleGroup}>
              <label className={styles.toggleLabel}>Activar Banner Global</label>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={bannerActive}
                  onChange={(e) => setBannerActive(e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.formGroup} style={{ opacity: bannerActive ? 1 : 0.5, pointerEvents: bannerActive ? 'auto' : 'none', transition: 'all 0.3s' }}>
              <label className={styles.formLabel}>Texto del Banner</label>
              <input
                type="text"
                className={styles.formInput}
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                placeholder="Ej. ¡Hoy 20% de descuento en Hamburguesas!"
                maxLength={60}
              />
              <span className={styles.helperText}>Máximo 60 caracteres. Para descuentos individuales por plato, dirígete a la pestaña "Menú".</span>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className={styles.settingsCard}>
            <h2 className={styles.cardTitle}>Código QR Inteligente</h2>
            <p className={styles.helperText} style={{ marginBottom: '2rem' }}>
              Descarga e imprime este código QR. Tus clientes podrán escanearlo con la cámara de sus celulares para ver tu menú en tiempo real y hacerte pedidos a WhatsApp.
            </p>

            <div className={styles.qrContainer}>
              <div className={styles.qrVisual} ref={qrRef}>
                <QRCodeSVG
                  value={menuUrl}
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"H"}
                  includeMargin={true}
                  imageSettings={{
                    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/GitHub_Invertocat_Logo.svg/1200px-GitHub_Invertocat_Logo.svg.png", // Placeholder, we can remove this or use a Zentriq icon
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              </div>

              <div className={styles.qrActions}>
                <div className={styles.qrUrlBox}>
                  <Globe size={16} className={styles.qrIcon} />
                  <span>{menuUrl}</span>
                </div>

                <button type="button" onClick={downloadQR} className={styles.downloadButton}>
                  <Download size={18} /> Descargar QR en alta calidad
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        {activeTab !== 'qr' && (
          <div className={styles.saveBar}>
            <button
              type="submit"
              disabled={isSaving}
              className={`${styles.saveButton} ${saveSuccess ? styles.saveButtonActive : ''}`}
            >
              {isSaving ? (
                <span>Guardando...</span>
              ) : saveSuccess ? (
                <>
                  <Check size={18} strokeWidth={3} />
                  <span>¡Guardado con éxito!</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
