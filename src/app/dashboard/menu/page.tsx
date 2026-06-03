'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Layers,
  UtensilsCrossed,
  Image as ImageIcon
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/supabase/storage';
import { demoCategories, demoItems, formatPrice } from '@/lib/demo-data';
import type { MenuCategory, MenuItem } from '@/types/menu';
import styles from './menu.module.css';


export default function MenuEditorPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Drawer Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDiscountPrice, setFormDiscountPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');

  // Load Categories & Items from Supabase
  useEffect(() => {
    async function fetchMenuData() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Fallback to demo data
        setCategories(demoCategories);
        setItems(demoItems);
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
        setUserId(user.id);

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

        const rId = member.restaurant_id;
        setRestaurantId(rId);

        // 3. Fetch Categories
        const { data: dbCategories, error: cError } = await supabase
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', rId)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true });

        if (cError) throw cError;

        // 4. Fetch Items
        const { data: dbItems, error: iError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', rId)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true });

        if (iError) throw iError;

        // Map categories
        const mappedCategories: MenuCategory[] = (dbCategories || []).map((cat) => ({
          id: cat.id,
          restaurantId: cat.restaurant_id,
          name: cat.name,
          description: cat.description || undefined,
          icon: cat.icon || undefined,
          sortOrder: cat.sort_order,
          isActive: cat.is_active,
        }));

        // Map items
        const mappedItems: MenuItem[] = (dbItems || []).map((item) => ({
          id: item.id,
          categoryId: item.category_id,
          restaurantId: item.restaurant_id,
          name: item.name,
          description: item.description || undefined,
          price: Number(item.price),
          discountPrice: item.discount_price ? Number(item.discount_price) : undefined,
          imageUrl: item.image_url || undefined,
          isAvailable: item.is_available,
          isFeatured: item.is_featured,
          sortOrder: item.sort_order,
          tags: item.tags || [],
        }));

        setCategories(mappedCategories);
        setItems(mappedItems);
      } catch (err) {
        console.error('Error fetching menu data from Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMenuData();
  }, []);

  // Category Emoji Lookup
  const categoryEmojis: Record<string, string> = {
    'cat-1': '🔥',
    'cat-2': '🥗',
    'cat-3': '🍖',
    'cat-4': '🍔',
    'cat-5': '🍕',
    'cat-6': '🍹',
    'cat-7': '🍰',
  };

  const getItemEmoji = (item: MenuItem) => {
    // Find category emoji
    const cat = categories.find((c) => c.id === item.categoryId);
    return cat?.icon || categoryEmojis[item.categoryId] || '🍽️';
  };

  // Availability & Featured toggles
  const handleToggleAvailable = async (itemId: string) => {
    const currentItem = items.find((item) => item.id === itemId);
    if (!currentItem) return;
    const nextVal = !currentItem.isAvailable;

    // UI Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isAvailable: nextVal } : item
      )
    );

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !restaurantId) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: nextVal })
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating availability in Supabase:', err);
      // Revert if error
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, isAvailable: currentItem.isAvailable } : item
        )
      );
    }
  };

  // Open Drawer for Add/Edit
  const openAddDrawer = () => {
    setEditingItem(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormDiscountPrice('');
    setFormCategory(categories[0]?.id || '');
    setFormFeatured(false);
    setFormImageUrl('');
    setFormImageFile(null);
    setFormImagePreview('');
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDesc(item.description || '');
    setFormPrice(item.price.toString());
    setFormDiscountPrice(item.discountPrice ? item.discountPrice.toString() : '');
    setFormCategory(item.categoryId);
    setFormFeatured(item.isFeatured);
    setFormImageUrl(item.imageUrl || '');
    setFormImageFile(null);
    setFormImagePreview(item.imageUrl || '');
    setIsDrawerOpen(true);
  };

  // Save Item (Create/Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName || !formPrice) return;

    const parsedPrice = parseFloat(formPrice);
    if (isNaN(parsedPrice)) return;
    
    const parsedDiscountPrice = formDiscountPrice ? parseFloat(formDiscountPrice) : undefined;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !restaurantId) {
      // Mock save logic fallback
      if (editingItem) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  name: formName,
                  description: formDesc,
                  price: parsedPrice,
                  discountPrice: parsedDiscountPrice,
                  categoryId: formCategory,
                  isFeatured: formFeatured,
                }
              : item
          )
        );
      } else {
        const newItem: MenuItem = {
          id: `item-${Date.now()}`,
          categoryId: formCategory,
          restaurantId: 'demo-001',
          name: formName,
          description: formDesc,
          price: parsedPrice,
          discountPrice: parsedDiscountPrice,
          imageUrl: '',
          isAvailable: true,
          isFeatured: formFeatured,
          sortOrder: items.length,
          tags: formFeatured ? ['popular'] : [],
        };
        setItems((prev) => [...prev, newItem]);
      }
      setIsDrawerOpen(false);
      return;
    }

    try {
      const supabase = createClient();
      
      let finalImageUrl = formImageUrl;
      
      if (formImageFile) {
        const uploadedUrl = await uploadImage(formImageFile, 'restaurant-media', `menu/${restaurantId}`);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
          setFormImageUrl(uploadedUrl);
        } else {
          alert('Error al subir la imagen.');
        }
      }

      if (editingItem) {
        // DB Update
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: formName,
            description: formDesc || null,
            price: parsedPrice,
            discount_price: parsedDiscountPrice || null,
            category_id: formCategory,
            is_featured: formFeatured,
            image_url: finalImageUrl,
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        setItems((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  name: formName,
                  description: formDesc,
                  price: parsedPrice,
                  discountPrice: parsedDiscountPrice,
                  categoryId: formCategory,
                  isFeatured: formFeatured,
                  imageUrl: finalImageUrl,
                }
              : item
          )
        );
      } else {
        // DB Insert
        const { data: inserted, error } = await supabase
          .from('menu_items')
          .insert({
            restaurant_id: restaurantId,
            category_id: formCategory,
            name: formName,
            description: formDesc || null,
            price: parsedPrice,
            discount_price: parsedDiscountPrice || null,
            is_available: true,
            is_featured: formFeatured,
            image_url: finalImageUrl,
            sort_order: items.length,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        const newItem: MenuItem = {
          id: inserted.id,
          categoryId: inserted.category_id,
          restaurantId: inserted.restaurant_id,
          name: inserted.name,
          description: inserted.description || undefined,
          price: Number(inserted.price),
          discountPrice: inserted.discount_price ? Number(inserted.discount_price) : undefined,
          imageUrl: inserted.image_url || undefined,
          isAvailable: inserted.is_available,
          isFeatured: inserted.is_featured,
          sortOrder: inserted.sort_order,
          tags: inserted.tags || [],
        };

        setItems((prev) => [...prev, newItem]);
      }
      setIsDrawerOpen(false);
    } catch (err) {
      console.error('Error saving menu item to Supabase:', err);
      alert('Error al guardar el producto.');
    }
  };

  // Delete Item (Soft Delete in DB)
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !restaurantId) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('menu_items')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .eq('id', itemId);

      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      console.error('Error deleting menu item in Supabase:', err);
      alert('Error al eliminar el producto.');
    }
  };

  // Add Category
  const handleAddCategory = async () => {
    const name = prompt('Nombre de la nueva categoría:');
    if (!name) return;
    const emoji = prompt('Emoji para la categoría (ej: 🍕):') || '🍽️';

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !restaurantId) {
      const newCategory: MenuCategory = {
        id: `cat-${Date.now()}`,
        restaurantId: 'demo-001',
        name,
        icon: emoji,
        sortOrder: categories.length,
        isActive: true,
      };
      setCategories((prev) => [...prev, newCategory]);
      return;
    }

    try {
      const supabase = createClient();
      const { data: inserted, error } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurantId,
          name,
          icon: emoji,
          sort_order: categories.length,
          is_active: true,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      const newCategory: MenuCategory = {
        id: inserted.id,
        restaurantId: inserted.restaurant_id,
        name: inserted.name,
        icon: inserted.icon || undefined,
        sortOrder: inserted.sort_order,
        isActive: inserted.is_active,
      };

      setCategories((prev) => [...prev, newCategory]);
    } catch (err) {
      console.error('Error creating category in Supabase:', err);
      alert('Error al crear la categoría.');
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.categoryId === activeCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, searchQuery]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
        <p>Cargando menú de la base de datos...</p>
      </div>
    );
  }

  return (
    <div className={styles.menuEditor}>
      {/* Search and Action Bar */}
      <div className={styles.headerActions}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar platos o bebidas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button className={styles.secondaryButton} onClick={handleAddCategory}>
            <Layers size={16} />
            Nueva Categoría
          </button>
          <button className={styles.primaryButton} onClick={openAddDrawer}>
            <Plus size={16} />
            Nuevo Plato
          </button>
        </div>
      </div>

      {/* Categories Row */}
      <div className={styles.categoriesRow}>
        <button
          className={`${styles.categoryTab} ${
            activeCategory === 'all' ? styles.categoryTabActive : ''
          }`}
          onClick={() => setActiveCategory('all')}
        >
          🍔 Todos
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.categoryTab} ${
              activeCategory === cat.id ? styles.categoryTabActive : ''
            }`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span>{cat.icon || '🍽️'}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
          <UtensilsCrossed size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.3 }} />
          <p>No se encontraron productos en esta categoría.</p>
        </div>
      ) : (
        <div className={styles.itemGrid}>
          {filteredItems.map((item) => (
            <div key={item.id} className={styles.itemCard}>
              <div className={styles.itemImageWrapper} style={{ overflow: 'hidden' }}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{getItemEmoji(item)}</span>
                )}
                {item.isFeatured && (
                  <span className={styles.featuredBadge}>Popular</span>
                )}
              </div>

              <div className={styles.itemBody}>
                <h3 className={styles.itemName}>{item.name}</h3>
                <p className={styles.itemDesc}>
                  {item.description || 'Sin descripción.'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.discountPrice ? (
                    <>
                      <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {formatPrice(item.price, 'COP')}
                      </span>
                      <span className={styles.itemPrice} style={{ color: '#10B981' }}>
                        {formatPrice(item.discountPrice, 'COP')}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '2px 6px', borderRadius: '4px' }}>
                        {Math.round((1 - item.discountPrice / item.price) * 100)}% OFF
                      </span>
                    </>
                  ) : (
                    <span className={styles.itemPrice}>
                      {formatPrice(item.price, 'COP')}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.itemFooter}>
                <label className={styles.toggleLabel}>
                  <span className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={item.isAvailable}
                      onChange={() => handleToggleAvailable(item.id)}
                    />
                    <span className={styles.slider} />
                  </span>
                  <span>{item.isAvailable ? 'Disponible' : 'Agotado'}</span>
                </label>

                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => openEditDrawer(item)}
                    aria-label="Editar producto"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                    onClick={() => handleDeleteItem(item.id)}
                    aria-label="Eliminar producto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Drawer */}
      {isDrawerOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsDrawerOpen(false)} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>
                {editingItem ? 'Editar Producto' : 'Crear Producto'}
              </h3>
              <button
                className={styles.drawerClose}
                onClick={() => setIsDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className={styles.drawerBody}>
                
                <div className={styles.formGroup} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-elevated)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {formImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={24} color="var(--color-text-muted)" />
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setFormImageFile(file);
                          setFormImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <label className={styles.formLabel} style={{ marginBottom: 4 }}>Foto del Producto</label>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>Opcional. Se recomienda 800x800px (JPG/PNG).</p>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre del plato</label>
                  <input
                    type="text"
                    required
                    className={styles.formInput}
                    placeholder="Ej. Hamburguesa de la casa"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descripción</label>
                  <textarea
                    className={styles.formInput}
                    rows={3}
                    placeholder="Describe los ingredientes, alérgenos, etc."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Precio (COP)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className={styles.formInput}
                      placeholder="35000"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Categoría</label>
                    <select
                      className={styles.formInput}
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className={styles.formGroup} style={{ marginTop: 'var(--space-2)' }}>
                  <label className={styles.formLabel}>Precio Promocional (Opcional)</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.formInput}
                    placeholder="Ej. 30000"
                    value={formDiscountPrice}
                    onChange={(e) => setFormDiscountPrice(e.target.value)}
                  />
                  <span className={styles.helperText}>Si ingresas un valor, este reemplazará el precio original y mostrará una etiqueta de descuento.</span>
                </div>

                <div className={styles.formGroup} style={{ marginTop: 'var(--space-2)' }}>
                  <label className={styles.toggleLabel}>
                    <span className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={formFeatured}
                        onChange={(e) => setFormFeatured(e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
                      Destacar plato (Popular)
                    </span>
                  </label>
                </div>
              </div>

              <div className={styles.drawerFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsDrawerOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
