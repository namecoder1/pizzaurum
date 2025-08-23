import { supabaseClient } from "@/lib/supabase-manager";
import { printLog } from "@/lib/utils";
import { OrderProps } from "@/types/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseUnifiedOrdersRealtimeOptions {
  // Modalità di funzionamento
  mode: 'admin' | 'customer' | 'realtime-only';
  
  // Parametri specifici per customer
  userId?: string;
  
  // Opzioni generali
  enabled?: boolean;
  fetchInitialData?: boolean;
  
  // Callbacks
  onOrderInsert?: (order: OrderProps) => void;
  onOrderUpdate?: (order: OrderProps) => void;
  onOrderDelete?: (orderId: string) => void;
  onError?: (error: any) => void;
  
  // Opzioni di filtraggio
  filterOldOrders?: boolean; // Filtra ordini più vecchi di 5 minuti
  maxAgeMinutes?: number; // Età massima degli ordini in minuti
}

export function useUnifiedOrdersRealtime(options: UseUnifiedOrdersRealtimeOptions) {
  const { 
    mode,
    userId,
    enabled = true, 
    fetchInitialData = true,
    onOrderInsert, 
    onOrderUpdate, 
    onOrderDelete,
    onError,
    filterOldOrders = false,
    maxAgeMinutes = 5
  } = options;

  const [orders, setOrders] = useState<OrderProps[]>([]);
  const [loading, setLoading] = useState(fetchInitialData);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  
  // Usa useRef per mantenere i callback stabili
  const callbacksRef = useRef({
    onOrderInsert,
    onOrderUpdate,
    onOrderDelete,
    onError
  });

  // Aggiorna i callback quando cambiano
  useEffect(() => {
    callbacksRef.current = {
      onOrderInsert,
      onOrderUpdate,
      onOrderDelete,
      onError
    };
  }, [onOrderInsert, onOrderUpdate, onOrderDelete, onError]);

  // Funzione per validare un ordine
  const validateOrder = useCallback((order: OrderProps): boolean => {
    if (!order.id || !order.user_id || !order.products || !order.created_at) {
      printLog(`❌ Invalid order data: ${order.id}`, true);
      return false;
    }
    
    // Filtra per userId se in modalità customer
    if (mode === 'customer' && order.user_id !== userId) {
      printLog(`🟡 ${mode} filtering out order ${order.id} - user_id: ${order.user_id}, current userId: ${userId}`);
      return false;
    }
    
    // Filtra ordini vecchi se richiesto
    if (filterOldOrders) {
      const orderTime = new Date(order.created_at).getTime();
      const maxAgeMs = maxAgeMinutes * 60 * 1000;
      const cutoffTime = Date.now() - maxAgeMs;
      
      if (orderTime < cutoffTime) {
        printLog(`❌ Skipping old order: ${order.id}`, true);
        return false;
      }
    }
    
    printLog(`🟡 ${mode} order ${order.id} validated successfully`);
    return true;
  }, [mode, userId, filterOldOrders, maxAgeMinutes]);

  // Fetch iniziale degli ordini
  const fetchOrders = useCallback(async () => {
    if (!fetchInitialData) {
      setLoading(false);
      return;
    }

    try {
      const supabase = supabaseClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      // Query ottimizzata con campi specifici invece di select('*')
      let query = supabase
        .from('orders')
        .select(`
          id,
          user_id,
          price,
          created_at,
          is_delivery,
          payment,
          status,
          customer_time,
          stripe_payment_intent_id,
          is_paid,
          is_refunded,
          net_profit,
          is_custom_time,
          payment_issuer,
          products
        `);
      
      // Filtra per userId se in modalità customer
      if (mode === 'customer' && userId) {
        query = query.eq('user_id', userId);
      }
      
      // Ordina per data di creazione (più recenti prima)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        printLog(`❌ Error fetching orders: ${error}`, true);
        callbacksRef.current.onError?.(error);
      } else {
        // Filtra i dati se necessario
        const typedData = data as unknown as OrderProps[];
        const filteredData = typedData?.filter(validateOrder) || [];
        printLog(`🟡 Orders fetched successfully: ${filteredData.length} orders`);
        setOrders(filteredData);
      }
    } catch (error) {
      printLog(`❌ Error: ${error}`, true);
      callbacksRef.current.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [mode, userId, fetchInitialData, validateOrder]);

  // Gestione eventi real-time
  const handleOrderInsert = useCallback((newOrder: OrderProps) => {
    if (!validateOrder(newOrder)) {
      return;
    }
    
    setOrders(prev => {
      // Verifica che non esista già
      const exists = prev.some(order => order.id === newOrder.id);
      if (exists) {
        printLog(`❌ Order already exists, skipping: ${newOrder.id}`, true);
        return prev;
      }
      
      printLog(`🟡 Adding new order: ${newOrder.id}`);
      return [newOrder, ...prev];
    });
    callbacksRef.current.onOrderInsert?.(newOrder);
  }, [validateOrder]);

  const handleOrderUpdate = useCallback((updatedOrder: OrderProps) => {
    printLog(`🟡 ${mode} handleOrderUpdate called for order ${updatedOrder.id} with status ${updatedOrder.status}`);
    
    if (!validateOrder(updatedOrder)) {
      printLog(`🟡 ${mode} order ${updatedOrder.id} failed validation, skipping update`);
      return;
    }
    
    setOrders(prev => {
      const updated = prev.map(order => 
        order.id === updatedOrder.id ? { ...updatedOrder } : order
      );
      printLog(`🟡 ${mode} orders state updated for order ${updatedOrder.id}`);
      return updated;
    });
    callbacksRef.current.onOrderUpdate?.(updatedOrder);
  }, [validateOrder, mode]);

  const handleOrderDelete = useCallback((deletedOrderId: string) => {
    if (!deletedOrderId) {
      printLog(`❌ Skipping delete with invalid order ID`, true);
      return;
    }
    
    setOrders(prev => 
      prev.filter(order => order.id !== deletedOrderId)
    );
    callbacksRef.current.onOrderDelete?.(deletedOrderId);
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled || isSubscribedRef.current) {
      printLog(`🟡 ${mode} subscription setup skipped: enabled=${enabled}, isSubscribed=${isSubscribedRef.current}`);
      return;
    }

    const setupRealtimeSubscription = async () => {
      try {
        printLog(`🟡 Setting up ${mode} realtime subscription...`);
        const supabase = supabaseClient();
        if (!supabase) {
          throw new Error('Failed to initialize Supabase client');
        }
        
        printLog(`🟡 Supabase client initialized successfully for ${mode}`);
        
        // Crea un canale unico per evitare conflitti
        const channelName = `${mode}_orders_realtime_${Date.now()}`;
        printLog(`🟡 Creating channel: ${channelName}`);
        
        const subscription = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders'
            },
            (payload) => {
              printLog(`🟡 ${mode} realtime order change: ${payload.eventType} for order ${(payload.new as any)?.id || (payload.old as any)?.id}`);
              
              if (payload.eventType === 'INSERT') {
                printLog(`🟡 ${mode} INSERT event received for order ${(payload.new as any)?.id}`);
                handleOrderInsert(payload.new as OrderProps);
              } else if (payload.eventType === 'UPDATE') {
                printLog(`🟡 ${mode} UPDATE event received for order ${(payload.new as any)?.id}, status: ${(payload.new as any)?.status}`);
                handleOrderUpdate(payload.new as OrderProps);
              } else if (payload.eventType === 'DELETE') {
                printLog(`🟡 ${mode} DELETE event received for order ${(payload.old as any)?.id}`);
                handleOrderDelete((payload.old as any).id);
              }
            }
          )
          .on('presence', { event: 'sync' }, () => {
            printLog(`🟡 ${mode} presence sync`);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            printLog(`🟡 ${mode} presence join`);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            printLog(`🟡 ${mode} presence leave`);
          })
          .subscribe((status) => {
            printLog(`🟡 ${mode} realtime subscription status: ${status}`);
            setIsConnected(status === 'SUBSCRIBED');
            
            if (status === 'SUBSCRIBED') {
              printLog(`🟡 ${mode} realtime subscription setup complete`);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              printLog(`🟡 ${mode} realtime subscription disconnected`);
            }
          });

        subscriptionRef.current = subscription;
        isSubscribedRef.current = true;
        printLog(`🟡 ${mode} subscription setup completed successfully`);
      } catch (error) {
        printLog(`❌ Error setting up ${mode} realtime subscription: ${error}`, true);
        callbacksRef.current.onError?.(error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      printLog(`🟡 Cleaning up ${mode} realtime subscription...`);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [enabled, mode, handleOrderInsert, handleOrderUpdate, handleOrderDelete]);

  // Fetch iniziale
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Cleanup al dismount
  useEffect(() => {
    return () => {
      printLog(`🟡 Component unmounting, cleaning up ${mode} subscription...`);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [mode]);

  // Funzioni helper per filtrare gli ordini
  const getOrdersByStatus = useCallback((status: OrderProps['status']) => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  const getTodayOrders = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return orders.filter(order => 
      order.created_at.startsWith(today)
    );
  }, [orders]);

  const getPendingOrders = useCallback(() => {
    return orders.filter(order => 
      order.status === 'pending' || order.status === 'accepted'
    );
  }, [orders]);

  const getCompletedOrders = useCallback(() => {
    return orders.filter(order => 
      order.status === 'completed' || order.status === 'delivered'
    );
  }, [orders]);

  const getCancelledOrders = useCallback(() => {
    return orders.filter(order => 
      order.status === 'cancelled'
    );
  }, [orders]);

  // Funzioni per manipolare gli ordini localmente
  const addOrder = useCallback((order: OrderProps) => {
    setOrders(prev => [order, ...prev]);
  }, []);

  const updateOrder = useCallback((orderId: string, updates: Partial<OrderProps>) => {
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId 
          ? { ...order, ...updates }
          : order
      )
    );
  }, []);

  const removeOrder = useCallback((orderId: string) => {
    setOrders(prev => 
      prev.filter(order => order.id !== orderId)
    );
  }, []);

  const refreshOrders = useCallback(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    isConnected,
    refetch: fetchOrders,
    // Funzioni helper
    getOrdersByStatus,
    getTodayOrders,
    getPendingOrders,
    getCompletedOrders,
    getCancelledOrders,
    // Funzioni di manipolazione
    addOrder,
    updateOrder,
    removeOrder,
    refreshOrders
  };
}

// Hook di convenienza per admin
export function useAdminOrdersWithRealtime(options: Omit<UseUnifiedOrdersRealtimeOptions, 'mode'> = {}) {
  return useUnifiedOrdersRealtime({
    ...options,
    mode: 'admin'
  });
}

// Hook di convenienza per customer
export function useCustomerOrdersWithRealtime(userId: string, options: Omit<UseUnifiedOrdersRealtimeOptions, 'mode' | 'userId'> = {}) {
  return useUnifiedOrdersRealtime({
    ...options,
    mode: 'customer',
    userId
  });
}

// Hook di convenienza per realtime-only (senza fetch iniziale)
export function useRealtimeOrdersOnly(options: Omit<UseUnifiedOrdersRealtimeOptions, 'mode' | 'fetchInitialData'> = {}) {
  return useUnifiedOrdersRealtime({
    ...options,
    mode: 'realtime-only',
    fetchInitialData: false,
    filterOldOrders: true
  });
}
