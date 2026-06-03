'use client';

import { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Utensils,
  Check,
  Play,
} from 'lucide-react';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/demo-data';
import type { Order, OrderStatus } from '@/types/menu';
import styles from './overview.module.css';

// Initial mock orders fallback
const initialOrders: Order[] = [
  {
    id: 'ord-001',
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
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
  },
  {
    id: 'ord-002',
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
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
  },
  {
    id: 'ord-003',
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
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(), // 32 mins ago
  },
];

const popularItems = [
  { rank: 1, name: 'Burger Smash Doble', sales: 48, percentage: 100 },
  { rank: 2, name: 'Bowl Teriyaki', sales: 36, percentage: 75 },
  { rank: 3, name: 'Lomo en Costra de Café', sales: 22, percentage: 46 },
  { rank: 4, name: 'Limonada de Coco', sales: 19, percentage: 40 },
  { rank: 5, name: 'Cheesecake de Maracuyá', sales: 14, percentage: 29 },
];

export default function DashboardOverview() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
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

        // 3. Fetch active orders
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

    loadDashboardData();
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
        return 'En Cocina'; // Map confirmed to En Cocina
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
      case 'confirmed':
      case 'preparing':
        return styles.statusPreparing;
      case 'ready':
        return styles.statusReady;
      case 'delivered':
        return styles.statusDelivered;
      default:
        return '';
    }
  };

  // Stats computed from state
  const activeOrdersCount = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  
  const todaySales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const avgTicket = orders.length > 0 ? todaySales / orders.length : 0;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
        <p>Cargando información del restaurante...</p>
      </div>
    );
  }

  return (
    <div className={styles.overview}>
      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Ventas de Hoy</span>
            <div className={styles.statIcon}>
              <DollarSign size={18} />
            </div>
          </div>
          <span className={styles.statValue}>{formatPrice(486500, 'COP')}</span>
          <div className={styles.statFooter}>
            <TrendingUp size={12} className={styles.trendUp} />
            <span className={styles.trendUp}>+14.2%</span>
            <span className={styles.trendNeutral}>vs ayer</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Pedidos Activos</span>
            <div className={styles.statIcon}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <span className={styles.statValue}>{activeOrdersCount}</span>
          <div className={styles.statFooter}>
            <span className={styles.trendNeutral}>
              {pendingOrdersCount} pendientes de confirmar
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Ticket Promedio</span>
            <div className={styles.statIcon}>
              <TrendingUp size={18} />
            </div>
          </div>
          <span className={styles.statValue}>{formatPrice(34750, 'COP')}</span>
          <div className={styles.statFooter}>
            <TrendingUp size={12} className={styles.trendUp} />
            <span className={styles.trendUp}>+4.8%</span>
            <span className={styles.trendNeutral}>este mes</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Productos Activos</span>
            <div className={styles.statIcon}>
              <Utensils size={18} />
            </div>
          </div>
          <span className={styles.statValue}>18</span>
          <div className={styles.statFooter}>
            <span className={styles.trendNeutral}>En 7 categorías</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Section */}
      <div className={styles.dashboardSection}>
        {/* Left Side: Recent Orders */}
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pedidos Recientes</h2>
            <span className={styles.viewAllLink}>Ver todos los pedidos</span>
          </div>

          <div className={styles.ordersList}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                No hay pedidos recientes.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div className={styles.orderUser}>
                      <span className={styles.orderName}>
                        #{order.orderNumber} — {order.customerName}
                      </span>
                      <span className={styles.orderMeta}>
                        {order.customerPhone} •{' '}
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

                  {order.notes && (
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        background: 'rgba(212, 175, 55, 0.05)',
                        borderLeft: '2px solid var(--color-primary)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <strong>Nota:</strong> {order.notes}
                    </div>
                  )}

                  <div className={styles.orderItems}>
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

                  <div className={styles.orderFooter}>
                    <div className={styles.orderTotal}>
                      <span className={styles.totalLabel}>Total</span>
                      <span className={styles.totalValue}>
                        {formatPrice(order.total, 'COP')}
                      </span>
                    </div>

                    <div className={styles.orderActions}>
                      {order.status === 'pending' && (
                        <>
                          <button
                            style={{
                              background: 'var(--color-primary)',
                              color: 'var(--color-text-inverse)',
                              padding: 'var(--space-2) var(--space-4)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                          >
                            <Play size={12} fill="currentColor" />
                            Confirmar
                          </button>
                          <button
                            style={{
                              border: '1px solid var(--color-border)',
                              padding: 'var(--space-2) var(--space-3)',
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--color-error)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: '600',
                            }}
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          >
                            Rechazar
                          </button>
                        </>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          style={{
                            background: 'var(--color-success)',
                            color: 'var(--color-text-inverse)',
                            padding: 'var(--space-2) var(--space-4)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                        >
                          <Check size={12} strokeWidth={3} />
                          Listo
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button
                          style={{
                            border: '1px solid var(--color-primary)',
                            color: 'var(--color-primary)',
                            padding: 'var(--space-2) var(--space-4)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: '600',
                          }}
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                        >
                          Entregar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )))
            }
          </div>
        </div>

        {/* Right Side: Popular Items Rank */}
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Platos Populares</h2>
          </div>

          <div className={styles.popularList}>
            {popularItems.map((item) => (
              <div key={item.rank} className={styles.popularItem}>
                <span
                  className={`${styles.popularRank} ${
                    item.rank <= 3 ? styles.popularRankGold : ''
                  }`}
                >
                  #{item.rank}
                </span>

                <div className={styles.popularInfo}>
                  <span className={styles.popularName}>{item.name}</span>
                  <div className={styles.popularProgressWrapper}>
                    <div
                      className={styles.popularProgress}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>

                <div className={styles.popularSales}>
                  <div>{item.sales}</div>
                  <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                    pedidos
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
