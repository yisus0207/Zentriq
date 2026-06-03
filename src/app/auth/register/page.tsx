'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { branding } from '@/config/branding';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Fallback: simulate success
      setTimeout(() => {
        setIsLoading(false);
        router.push('/dashboard');
      }, 800);
      return;
    }

    try {
      const supabase = createClient();

      // 1. Sign up the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setErrorMsg(authError.message);
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setErrorMsg('No se pudo crear la cuenta de usuario.');
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;

      // 3. Create restaurant (which triggers member auto-provisioning)
      const publicSlug = restaurantName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-');

      const { error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantName,
          public_slug: publicSlug,
          created_by: userId,
          plan_type: 'free',
          is_active: true,
          is_public: true,
        });

      if (restaurantError) {
        setErrorMsg('Error al registrar tu restaurante: ' + restaurantError.message);
        setIsLoading(false);
        return;
      }

      // 4. Initialize basic settings and primary location
      // Fetch the restaurant ID we just created
      const { data: createdRestaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('public_slug', publicSlug)
        .single();

      if (createdRestaurant) {
        await Promise.all([
          supabase.from('restaurant_settings').insert({
            restaurant_id: createdRestaurant.id,
            currency: 'COP',
            timezone: 'America/Bogota',
          }),
          supabase.from('restaurant_locations').insert({
            restaurant_id: createdRestaurant.id,
            name: 'Principal',
            address: 'Dirección Principal',
            city: 'Medellín',
            country: 'Colombia',
            latitude: 6.2442,
            longitude: -75.5812,
            is_primary: true,
          })
        ]);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authGlow} aria-hidden="true" />

      <div className={styles.authCard}>
        <Link href="/" className={styles.authLogo}>
          <span className={styles.logoMark}>{branding.name.charAt(0)}</span>
          <span className={styles.logoText}>{branding.name}</span>
        </Link>

        <h1 className={styles.authTitle}>Crea tu restaurante</h1>
        <p className={styles.authSubtitle}>
          Comienza gratis. Tu menú digital en menos de 5 minutos.
        </p>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--color-error)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-xs)',
            marginBottom: 'var(--space-4)',
          }}>
            {errorMsg}
          </div>
        )}

        <form className={styles.authForm} onSubmit={handleRegister}>
          <div className={styles.inputGroup}>
            <label htmlFor="restaurant-name" className={styles.label}>
              Nombre del restaurante
            </label>
            <input
              id="restaurant-name"
              type="text"
              required
              placeholder="Mi Restaurante"
              className={styles.input}
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              required
              placeholder="tu@restaurante.com"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className={styles.submitButton}>
            {isLoading ? 'Registrando...' : 'Crear cuenta gratis'}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className={styles.authFooter}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className={styles.authLink}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
