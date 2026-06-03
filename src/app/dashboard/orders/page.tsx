'use client';

import { useState, useMemo, useEffect } from 'react';
import { Play, Check, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/demo-data';
import type { Order, OrderStatus } from '@/types/menu';
import styles from './orders.module.css';

// More extensive list of mock orders fallback
const initialOrders: Order[] = [
  {
    id: 'ord-101',
    restaurantId: 'demo-001',
    orderNumber: 1024,
    customerName: 'Santiago Gómez',
    customerPhone: '+57 301 555 1234',
    items: [
      {
        item: {
          id: 'item-2',
          categoryId: 'cat-1',
          restaurantId: 'demo-001',
          name: 'Burger Smash Doble',
          price: 38900,
          isAvailable: true,
          isFeatured: true,
          sortOrder: 1,
          tags: ['popular'],
        },
        quantity: 2,
      },
      {
        item: {
          id: 'item-14',
          categoryId: 'cat-6',
          restaurantId: 'demo-001',
          name: 'Limonada de Coco',
          price: 14900,
          isAvailable: true,
          isFeatured: false,
          sortOrder: 0,
          tags: [],
        },
        quantity: 2,
      },
    ],
    subtotal: 107600,
    total: 107600,
    status: 'pending',
    notes: 'Sin cebolla en las hamburguesas, por favor.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'ord-102',
    restaurantId: 'demo-001',
    orderNumber: 1023,
    customerName: 'Mariana Restrepo',
    customerPhone: '+57 312 888 4567',
    items: [
      {
        item: {
          id: 'item-3',
          categoryId: 'cat-1',
          restaurantId: 'demo-001',
          name: 'Lomo en Costra de Café',
          price: 54900,
          isAvailable: true,
          isFeatured: true,
          sortOrder: 2,
          tags: ['popular', 'premium'],
        },
        quantity: 1,
      },
      {
        item: {
          id: 'item-12',
          categoryId: 'cat-5',
          restaurantId: 'demo-001',
          name: 'Margherita Pizza',
          price: 28900,
          isAvailable: true,
          isFeatured: false,
          sortOrder: 0,
          tags: ['vegetariano'],
        },
        quantity: 1,
      },
    ],
    subtotal: 83800,
    total: 83800,
    status: 'preparing',
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'ord-103',
    restaurantId: 'demo-001',
    orderNumber: 1022,
    customerName: 'Mateo Osorio',
    customerPhone: '+57 300 444 9876',
    items: [
      {
        item: {
          id: 'item-1',
          categoryId: 'cat-1',
          restaurantId: 'demo-001',
          name: 'Bowl Teriyaki',
          price: 32900,
          isAvailable: true,
          isFeatured: true,
          sortOrder: 0,
          tags: ['popular'],
        },
        quantity: 1,
      },
    ],
    subtotal: 32900,
    total: 32900,
    status: 'ready',
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
  },
  {
    id: 'ord-104',
    restaurantId: 'demo-001',
    orderNumber: 1021,
    customerName: 'Camila Espinal',
    customerPhone: '+57 315 222 3456',
    items: [
      {
        item: {
          id: 'item-17',
          categoryId: 'cat-7',
          restaurantId: 'demo-001',
          name: 'Brownie Volcán',
          price: 19900,
          isAvailable: true,
          isFeatured: true,
          sortOrder: 0,
          tags: ['popular'],
        },
        quantity: 1,
      },
      {
        item: {
          id: 'item-14',
          categoryId: 'cat-6',
          restaurantId: 'demo-001',
          name: 'Limonada de Coco',
          price: 14900,
          isAvailable: true,
          isFeatured: false,
          sortOrder: 0,
          tags: [],
        },
        quantity: 1,
      },
    ],
    subtotal: 34800,
    total: 34800,
    status: 'delivered',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
  },
  {
    id: 'ord-105',
    restaurantId: 'demo-001',
    orderNumber: 1020,
    customerName: 'Alejandro Torres',
    customerPhone: '+57 311 777 5678',
    items: [
      {
        item: {
          id: 'item-10',
          categoryId: 'cat-4',
          restaurantId: 'demo-001',
          name: 'Classic Burger',
          price: 29900,
          isAvailable: true,
          isFeatured: false,
          sortOrder: 0,
          tags: [],
        },
        quantity: 2,
      },
    ],
    subtotal: 59800,
    total: 59800,
    status: 'cancelled',
    notes: 'Cancelado por el cliente antes de confirmar.',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

type FilterType = 'all' | OrderStatus;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrdersData() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setOrders(initialOrders);
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

        // 3. Fetch all orders
        const { data: dbOrders, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              menu_item:menu_item_id (*)
            )
          `)
          .eq('restaurant_id', member.restaurant_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Map DB orders to client Order type
        const mappedOrders: Order[] = (dbOrders || []).map((ord) => ({
          id: ord.id,
          restaurantId: ord.restaurant_id,
          orderNumber: isNaN(Number(ord.order_number?.replace('#', ''))) ? 1000 : Number(ord.order_number?.replace('#', '')),
          customerName: ord.customer_name || undefined,
          customerPhone: ord.customer_phone || undefined,
          items: (ord.order_items || []).map((oi: any) => ({
            item: {
              id: oi.menu_item?.id || oi.menu_item_id || '',
              categoryId: oi.menu_item?.category_id || '',
              restaurantId: ord.restaurant_id,
              name: oi.name_snapshot,
              price: Number(oi.price_snapshot),
              isAvailable: true,
              isFeatured: false,
              sortOrder: 0,
              tags: [],
            },
            quantity: oi.quantity,
          })),
          subtotal: Number(ord.subtotal),
          total: Number(ord.total),
          status: (ord.status === 'accepted' ? 'confirmed' : ord.status === 'completed' ? 'delivered' : ord.status) as any,
          notes: ord.notes || undefined,
          createdAt: ord.created_at,
        }));

        setOrders(mappedOrders);
      } catch (err) {
        console.error('Error loading dashboard orders from Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrdersData();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    // UI Optimistic update
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? { ...ord, status: newStatus }
          : ord
      )
    );

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !restaurantId) return;

    try {
      const supabase = createClient();
      let dbStatus = newStatus as string;
      if (newStatus === 'confirmed') dbStatus = 'accepted';
      if (newStatus === 'delivered') dbStatus = 'completed';

      const { error } = await supabase
        .from('orders')
        .update({ status: dbStatus })
        .eq('id', orderId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating order status in Supabase:', err);
      alert('Error al actualizar el estado del pedido.');
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'En Cocina';
      case 'preparing':
        return 'En Cocina';
      case 'ready':
        return 'Listo';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
    }
  };


  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'preparing':
        return styles.statusPreparing;
      case 'ready':
        return styles.statusReady;
      case 'delivered':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  // Count helper
  const counts = useMemo(() => {
    const defaultCounts: Record<FilterType, number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      defaultCounts[o.status] = (defaultCounts[o.status] || 0) + 1;
    });
    return defaultCounts;
  }, [orders]);

  // Filtered list
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  return (
    <div className={styles.ordersContainer}>
      {/* Filters Row */}
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterTab} ${
            activeFilter === 'all' ? styles.filterTabActive : ''
          }`}
          onClick={() => setActiveFilter('all')}
        >
          <span>Todos</span>
          <span className={styles.badge}>{counts.all}</span>
        </button>

        <button
          className={`${styles.filterTab} ${
            activeFilter === 'pending' ? styles.filterTabActive : ''
          }`}
          onClick={() => setActiveFilter('pending')}
        >
          <span>Pendientes</span>
          <span className={styles.badge}>{counts.pending}</span>
        </button>

        <button
          className={`${styles.filterTab} ${
            activeFilter === 'preparing' ? styles.filterTabActive : ''
          }`}
          onClick={() => setActiveFilter('preparing')}
        >
          <span>En Cocina</span>
          <span className={styles.badge}>{counts.preparing}</span>
        </button>

        <button
          className={`${styles.filterTab} ${
            activeFilter === 'ready' ? styles.filterTabActive : ''
          }`}
          onClick={() => setActiveFilter('ready')}
        >
          <span>Listos</span>
          <span className={styles.badge}>{counts.ready}</span>
        </button>

        <button
          className={`${styles.filterTab} ${
            activeFilter === 'delivered' ? styles.filterTabActive : ''
          }`}
          onClick={() => setActiveFilter('delivered')}
        >
          <span>Entregados</span>
          <span className={styles.badge}>{counts.delivered}</span>
        </button>

        <button
          className={`${styles.filterTab} ${
            activeFilter === 'cancelled' ? styles.filterTabActive : ''
          }`}
          onClick={() => setActiveFilter('cancelled')}
        >
          <span>Cancelados</span>
          <span className={styles.badge}>{counts.cancelled}</span>
        </button>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) 0', color: 'var(--color-text-secondary)' }}>
          <ClipboardList size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.3 }} />
          <p>No hay pedidos en este estado.</p>
        </div>
      ) : (
        <div className={styles.ordersGrid}>
          {filteredOrders.map((order) => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.cardHeader}>
                <div className={styles.orderInfo}>
                  <span className={styles.orderNumber}>Pedido #{order.orderNumber}</span>
                  <span className={styles.orderTime}>
                    Recibido:{' '}
                    {new Date(order.createdAt).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.customerSection}>
                  <span className={styles.customerName}>{order.customerName}</span>
                  <span className={styles.customerPhone}>{order.customerPhone}</span>
                </div>

                {order.notes && (
                  <div className={styles.notesSection}>
                    <strong>Nota:</strong> {order.notes}
                  </div>
                )}

                <div className={styles.itemsSection}>
                  {order.items.map((ci, idx) => (
                    <div key={idx} className={styles.orderItem}>
                      <span>
                        <span className={styles.itemQty}>{ci.quantity}x</span>{' '}
                        {ci.item.name}
                      </span>
                      <span>{formatPrice(ci.item.price * ci.quantity, 'COP')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.totalSection}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>
                    {formatPrice(order.total, 'COP')}
                  </span>
                </div>

                <div className={styles.actionsSection}>
                  {order.status === 'pending' && (
                    <>
                      <button
                        className={styles.btnPrimary}
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                      >
                        <Play size={12} fill="currentColor" />
                        Confirmar
                      </button>
                      <button
                        className={styles.btnDanger}
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      >
                        Rechazar
                      </button>
                    </>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      className={styles.btnSuccess}
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                    >
                      <Check size={12} strokeWidth={3} />
                      Marcar Listo
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      className={styles.btnPrimary}
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                    >
                      Entregar Pedido
                    </button>
                  )}

                  {order.status === 'delivered' && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                      Completado ✓
                    </span>
                  )}

                  {order.status === 'cancelled' && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: '500' }}>
                      Cancelado ✕
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
