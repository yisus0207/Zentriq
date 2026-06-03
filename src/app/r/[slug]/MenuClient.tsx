'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Minus, Plus, ArrowRight, Megaphone, ArrowLeft } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/demo-data';
import type { Restaurant, MenuCategory, MenuItem } from '@/types/menu';
import Link from 'next/link';
import styles from './menu.module.css';

interface MenuClientProps {
  restaurant: Restaurant;
  categories: MenuCategory[];
  items: MenuItem[];
}

// Category icon map for placeholder images
const categoryEmojis: Record<string, string> = {
  'cat-1': '🔥',
  'cat-2': '🥗',
  'cat-3': '🍖',
  'cat-4': '🍔',
  'cat-5': '🍕',
  'cat-6': '🍹',
  'cat-7': '🍰',
};

export function MenuClient({ restaurant, categories, items }: MenuClientProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Customer checkout form state
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const {
    items: cartItems,
    isOpen,
    addItem,
    updateQuantity,
    clearCart,
    openCart,
    closeCart,
    totalItems,
    subtotal,
  } = useCart();

  const itemCount = totalItems();
  const cartSubtotal = subtotal();

  // Intersection Observer for sticky category highlighting
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    categories.forEach((cat) => {
      const el = sectionRefs.current[cat.id];
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isScrollingRef.current) {
            setActiveCategory(cat.id);
            // Scroll tab into view
            const tab = document.getElementById(`tab-${cat.id}`);
            tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        },
        { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [categories]);

  const scrollToCategory = useCallback((categoryId: string) => {
    const el = sectionRefs.current[categoryId];
    if (el) {
      isScrollingRef.current = true;
      setActiveCategory(categoryId);
      el.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  }, []);

  const handleAddItem = useCallback((item: MenuItem) => {
    addItem(item);
    setBouncingId(item.id);
    setTimeout(() => setBouncingId(null), 300);
  }, [addItem]);

  // Get items for a category
  const getItemsForCategory = (categoryId: string) =>
    items.filter((item) => item.categoryId === categoryId);

  // Find the category emoji for an item
  const getItemEmoji = (item: MenuItem) => {
    return categoryEmojis[item.categoryId] || '🍽️';
  };

  // Called from cart footer - opens the customer form
  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    const phone = restaurant.phone ? restaurant.phone.replace(/[\s+]/g, '') : '';
    if (!phone) {
      alert('El restaurante no tiene un número de WhatsApp configurado.');
      return;
    }
    closeCart();
    setShowCheckoutForm(true);
  };

  // Called from the checkout form - builds and sends to WhatsApp
  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = restaurant.phone ? restaurant.phone.replace(/[\s+]/g, '') : '';

    let text = `*🛒 Nuevo pedido - ${restaurant.name}* %0A%0A`;
    text += `*Pedido:*%0A`;
    cartItems.forEach((ci) => {
      const priceToUse = ci.item.discountPrice || ci.item.price;
      text += `%E2%80%A2 ${ci.quantity}x ${ci.item.name} - ${formatPrice(priceToUse * ci.quantity, restaurant.currency)}%0A`;
    });
    text += `%0A*Total: ${formatPrice(cartSubtotal, restaurant.currency)}*%0A%0A`;
    text += `*Datos del cliente:*%0A`;
    text += `👤 Nombre: ${customerName}%0A`;
    if (customerPhone) text += `📱 Teléfono: ${customerPhone}%0A`;
    if (customerAddress) text += `📍 Dirección: ${customerAddress}%0A`;
    if (customerNotes) text += `%0A📝 Comentarios: ${customerNotes}%0A`;

    const waUrl = `https://wa.me/${phone}?text=${text}`;
    window.open(waUrl, '_blank');
    setShowCheckoutForm(false);
    clearCart();
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerNotes('');
  };

  return (
    <div className={styles.menuPage}>
      {/* Global Promotional Banner */}
      {(restaurant.settings?.bannerActive as boolean) && (restaurant.settings?.bannerText as string) && (
        <div className={styles.globalBanner}>
          <Megaphone size={18} className={styles.bannerIcon} />
          <span>{restaurant.settings.bannerText as string}</span>
        </div>
      )}

      {/* Cover */}
      <div className={styles.coverWrapper}>
        <Link href="/explorar" className={styles.backButton}>
          <ArrowLeft size={18} />
          <span>Volver</span>
        </Link>
        <div
          className={styles.coverImage}
          style={{
            backgroundImage: restaurant.coverUrl ? `url(${restaurant.coverUrl})` : undefined,
          }}
        />
        <div className={styles.coverGradient} />
      </div>

      {/* Restaurant Info */}
      <div className={styles.restaurantInfo}>
        <div className={styles.restaurantLogo}>
          {restaurant.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={restaurant.logoUrl} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            restaurant.name.charAt(0)
          )}
        </div>
        <h1 className={styles.restaurantName}>{restaurant.name}</h1>
        <div className={styles.restaurantMeta}>
          <span>⭐ 4.8</span>
          <span>•</span>
          <span>📍 {restaurant.address?.split(',')[0]}</span>
        </div>
        {restaurant.description && (
          <p className={styles.restaurantDesc}>{restaurant.description}</p>
        )}
      </div>

      {/* Sticky Category Tabs */}
      <div className={styles.categoryTabs} ref={tabsRef}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`tab-${cat.id}`}
            className={`${styles.categoryTab} ${
              activeCategory === cat.id ? styles.categoryTabActive : ''
            }`}
            onClick={() => scrollToCategory(cat.id)}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Menu Sections */}
      {categories.map((cat) => {
        const catItems = getItemsForCategory(cat.id);
        if (catItems.length === 0) return null;

        return (
          <section
            key={cat.id}
            ref={(el) => { sectionRefs.current[cat.id] = el; }}
            className={styles.menuSection}
            id={`section-${cat.id}`}
          >
            <h2 className={styles.sectionTitle}>
              <span>{cat.icon}</span>
              {cat.name}
            </h2>

            <div className={styles.productGrid}>
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.productCard} ${
                    !item.isAvailable ? styles.unavailable : ''
                  }`}
                >
                  <div className={styles.productImageWrapper}>
                    {item.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className={styles.productImage}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.productImagePlaceholder}>
                        {getItemEmoji(item)}
                      </div>
                    )}
                    {item.isFeatured && (
                      <span className={styles.productBadge}>Popular</span>
                    )}
                    {!item.isAvailable && (
                      <span className={styles.unavailableLabel}>No disponible</span>
                    )}
                  </div>

                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{item.name}</h3>
                    {item.description && (
                      <p className={styles.productDesc}>{item.description}</p>
                    )}
                    <div className={styles.productBottom}>
                      {item.discountPrice ? (
                        <div className={styles.priceContainer}>
                          <span className={styles.originalPrice}>
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                          <span className={styles.discountPrice}>
                            {formatPrice(item.discountPrice, restaurant.currency)}
                          </span>
                          <span className={styles.discountBadge}>
                            {Math.round((1 - item.discountPrice / item.price) * 100)}% OFF
                          </span>
                        </div>
                      ) : (
                        <span className={styles.productPrice}>
                          {formatPrice(item.price, restaurant.currency)}
                        </span>
                      )}
                      {item.isAvailable && (
                        <button
                          className={`${styles.addButton} ${
                            bouncingId === item.id ? styles.addButtonBounce : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddItem(item);
                          }}
                          aria-label={`Agregar ${item.name} al carrito`}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Cart FAB */}
      {itemCount > 0 && (
        <div className={styles.cartFab}>
          <button className={styles.cartFabButton} onClick={openCart}>
            <div className={styles.cartFabLeft}>
              <span className={styles.cartCount}>{itemCount}</span>
              <span className={styles.cartFabLabel}>Ver carrito</span>
            </div>
            <span className={styles.cartFabPrice}>
              {formatPrice(cartSubtotal, restaurant.currency)}
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {isOpen && (
        <>
          <div className={styles.cartOverlay} onClick={closeCart} />
          <div className={styles.cartDrawer}>
            <div className={styles.cartHandle} />

            <div className={styles.cartHeader}>
              <h3 className={styles.cartTitle}>
                Tu pedido ({itemCount})
              </h3>
              <button className={styles.cartClear} onClick={clearCart}>
                Vaciar
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className={styles.emptyCart}>
                <div className={styles.emptyCartIcon}>🛒</div>
                <p className={styles.emptyCartText}>Tu carrito está vacío</p>
              </div>
            ) : (
              <>
                <div className={styles.cartItems}>
                  {cartItems.map((ci) => (
                    <div key={ci.item.id} className={styles.cartItem}>
                      <div className={styles.cartItemImage}>
                        {getItemEmoji(ci.item)}
                      </div>
                      <div className={styles.cartItemInfo}>
                        <div className={styles.cartItemName}>{ci.item.name}</div>
                        <div className={styles.cartItemPrice}>
                          {ci.item.discountPrice
                            ? formatPrice(ci.item.discountPrice * ci.quantity, restaurant.currency)
                            : formatPrice(ci.item.price * ci.quantity, restaurant.currency)}
                        </div>
                      </div>
                      <div className={styles.cartItemQty}>
                        <button
                          className={styles.qtyButton}
                          onClick={() =>
                            updateQuantity(ci.item.id, ci.quantity - 1)
                          }
                          aria-label="Reducir cantidad"
                        >
                          <Minus size={14} />
                        </button>
                        <span className={styles.qtyValue}>{ci.quantity}</span>
                        <button
                          className={styles.qtyButton}
                          onClick={() =>
                            updateQuantity(ci.item.id, ci.quantity + 1)
                          }
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.cartFooter}>
                  <div className={styles.cartTotal}>
                    <span className={styles.cartTotalLabel}>Total</span>
                    <span className={styles.cartTotalValue}>
                      {formatPrice(cartSubtotal, restaurant.currency)}
                    </span>
                  </div>
                  <button className={styles.checkoutButton} onClick={handleCheckout}>
                    Hacer pedido (WhatsApp)
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
      {/* Checkout Form Modal */}
      {showCheckoutForm && (
        <>
          <div className={styles.cartOverlay} onClick={() => setShowCheckoutForm(false)} />
          <div className={styles.cartDrawer}>
            <div className={styles.cartHandle} />

            <div className={styles.cartHeader}>
              <h3 className={styles.cartTitle}>📦 Datos para tu pedido</h3>
              <button className={styles.cartClear} onClick={() => setShowCheckoutForm(false)}>Volver</button>
            </div>

            {/* Order summary */}
            <div className={styles.checkoutSummary}>
              {cartItems.map((ci) => (
                <div key={ci.item.id} className={styles.summaryItem}>
                  <span>{ci.quantity}x {ci.item.name}</span>
                  <span>{formatPrice((ci.item.discountPrice || ci.item.price) * ci.quantity, restaurant.currency)}</span>
                </div>
              ))}
              <div className={styles.summaryTotal}>
                <span>Total</span>
                <strong>{formatPrice(cartSubtotal, restaurant.currency)}</strong>
              </div>
            </div>

            <form onSubmit={handleConfirmOrder} className={styles.checkoutForm}>
              <div className={styles.checkoutFields}>
                <div className={styles.checkoutField}>
                  <label className={styles.checkoutLabel}>Tu nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. María García"
                    className={styles.checkoutInput}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className={styles.checkoutField}>
                  <label className={styles.checkoutLabel}>Tu teléfono (opcional)</label>
                  <input
                    type="tel"
                    placeholder="Ej. +57 300 123 4567"
                    className={styles.checkoutInput}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className={styles.checkoutField}>
                  <label className={styles.checkoutLabel}>📍 Dirección de entrega (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Calle 10 #43-12, Apto 301"
                    className={styles.checkoutInput}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>

                <div className={styles.checkoutField}>
                  <label className={styles.checkoutLabel}>📝 Comentarios o instrucciones especiales</label>
                  <textarea
                    rows={3}
                    placeholder="Ej. Sin cebolla, punto de la carne a 3/4..."
                    className={styles.checkoutInput}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div className={styles.cartFooter}>
                <button type="submit" className={styles.checkoutButton}>
                  Enviar pedido por WhatsApp
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
