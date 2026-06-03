import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { branding } from '@/config/branding';
import { createClient } from '@/lib/supabase/server';
import { demoRestaurant, demoCategories, demoItems } from '@/lib/demo-data';
import { MenuClient } from './MenuClient';

// Fetch restaurant details from Supabase with mock fallback
async function getRestaurantBySlug(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || slug === 'demo') {
    return {
      restaurant: demoRestaurant,
      categories: demoCategories,
      items: demoItems,
    };
  }

  try {
    const supabase = await createClient();

    // 1. Fetch restaurant details
    const { data: dbRestaurant, error: rError } = await supabase
      .from('public_restaurants')
      .select('*')
      .eq('public_slug', slug)
      .single();

    if (rError || !dbRestaurant) {
      console.log('Restaurant not found in Supabase:', slug);
      return null;
    }

    // 2. Fetch settings (currency & timezone)
    const { data: dbSettings } = await supabase
      .from('restaurant_settings')
      .select('currency, timezone')
      .eq('restaurant_id', dbRestaurant.id)
      .single();

    // 3. Fetch primary location
    const { data: dbLocation } = await supabase
      .from('restaurant_locations')
      .select('address')
      .eq('restaurant_id', dbRestaurant.id)
      .eq('is_primary', true)
      .single();

    // 4. Fetch menu categories
    const { data: dbCategories } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', dbRestaurant.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    // 5. Fetch menu items
    const { data: dbItems } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', dbRestaurant.id)
      .eq('is_available', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    // Map DB snake_case structure to client interface
    const restaurant = {
      id: dbRestaurant.id,
      name: dbRestaurant.name,
      slug: dbRestaurant.public_slug,
      description: dbRestaurant.description || undefined,
      logoUrl: dbRestaurant.logo_url || undefined,
      coverUrl: dbRestaurant.cover_url || undefined,
      phone: dbRestaurant.phone || undefined,
      address: dbLocation?.address || undefined,
      currency: dbSettings?.currency || 'COP',
      isActive: true,
      settings: { timezone: dbSettings?.timezone || 'America/Bogota' },
    };

    const categories = (dbCategories || []).map((cat) => ({
      id: cat.id,
      restaurantId: cat.restaurant_id,
      name: cat.name,
      description: cat.description || undefined,
      icon: cat.icon || undefined,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
    }));

    const items = (dbItems || []).map((item) => ({
      id: item.id,
      categoryId: item.category_id,
      restaurantId: item.restaurant_id,
      name: item.name,
      description: item.description || undefined,
      price: Number(item.price),
      imageUrl: item.image_url || undefined,
      isAvailable: item.is_available,
      isFeatured: item.is_featured,
      sortOrder: item.sort_order,
      tags: item.tags || [],
    }));

    return { restaurant, categories, items };
  } catch (error) {
    console.error('Error fetching data from Supabase, falling back to demo data:', error);
    return {
      restaurant: demoRestaurant,
      categories: demoCategories,
      items: demoItems,
    };
  }
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getRestaurantBySlug(slug);

  if (!data) {
    return { title: 'Restaurante no encontrado' };
  }

  return {
    title: `${data.restaurant.name} — Menú digital`,
    description: data.restaurant.description || `Menú de ${data.restaurant.name} en ${branding.name}`,
    openGraph: {
      title: `${data.restaurant.name} — Menú`,
      description: data.restaurant.description || '',
      type: 'website',
    },
  };
}

export default async function MenuPage(
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const data = await getRestaurantBySlug(slug);

  if (!data) {
    notFound();
  }

  return (
    <MenuClient
      restaurant={data.restaurant}
      categories={data.categories}
      items={data.items}
    />
  );
}
