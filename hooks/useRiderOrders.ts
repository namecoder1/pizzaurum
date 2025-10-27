import { supabaseClient } from "@/lib/supabase-manager";
import { printLog } from "@/lib/utils";
import { OrderProps } from "@/types/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseRiderOrdersOptions {
  riderId?: string;
  enabled?: boolean;
  onOrderInsert?: (order: OrderProps) => void;
  onOrderUpdate?: (order: OrderProps) => void;
  onOrderDelete?: (orderId: string) => void;
  onError?: (error: any) => void;
}

export function useRiderOrders(options: UseRiderOrdersOptions = {}) {
  const { 
    riderId,
    enabled = true, 
    onOrderInsert, 
    onOrderUpdate, 
    onOrderDelete,
    onError
  } = options;

  const [availableOrders, setAvailableOrders] = useState<OrderProps[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<OrderProps[]>([]);
  const [completedOrders, setCompletedOrders] = useState<OrderProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  
  const callbacksRef = useRef({
    onOrderInsert,
    onOrderUpdate,
    onOrderDelete,
    onError
  });

  useEffect(() => {
    callbacksRef.current = {
      onOrderInsert,
      onOrderUpdate,
      onOrderDelete,
      onError
    };
  }, [onOrderInsert, onOrderUpdate, onOrderDelete, onError]);

  // Fetch ordini disponibili (senza driver assegnato e con delivery)
  const fetchAvailableOrders = useCallback(async () => {
    try {
      const supabase = supabaseClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      const { data, error } = await supabase
        .from('orders')
        .select(`*`)
        .eq('is_delivery', true)
        .is('driver_id', null)
        .in('status', ['accepted', 'in_preparation', 'ready_to_pickup'])
        .order('created_at', { ascending: true });

      if (error) {
        printLog(`❌ Error fetching available orders: ${error}`, true);
        callbacksRef.current.onError?.(error);
      } else {
        const typedData = data as unknown as OrderProps[];
        setAvailableOrders(typedData || []);
        printLog(`🟡 Available orders fetched: ${typedData?.length || 0} orders`);
      }
    } catch (error) {
      printLog(`❌ Error: ${error}`, true);
      callbacksRef.current.onError?.(error);
    }
  }, []);

  // Fetch ordini assegnati al rider
  const fetchAssignedOrders = useCallback(async () => {
    if (!riderId) return;

    try {
      const supabase = supabaseClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      const { data, error } = await supabase
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
          is_paid,
          products,
          driver_id
        `)
        .eq('driver_id', riderId)
        .not('status', 'in', '(pending)')
        .order('created_at', { ascending: true });

      if (error) {
        printLog(`❌ Error fetching assigned orders: ${error}`, true);
        callbacksRef.current.onError?.(error);
      } else {
        const typedData = data as unknown as OrderProps[];
        setAssignedOrders(typedData || []);
        printLog(`🟡 Assigned orders fetched: ${typedData?.length || 0} orders`);
      }
    } catch (error) {
      printLog(`❌ Error: ${error}`, true);
      callbacksRef.current.onError?.(error);
    }
  }, [riderId]);

  // Fetch ordini completati dal rider
  const fetchCompletedOrders = useCallback(async () => {
    if (!riderId) return;

    try {
      const supabase = supabaseClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      const { data, error } = await supabase
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
          is_paid,
          products,
          driver_id
        `)
        .eq('driver_id', riderId)
        .in('status', ['completed', 'delivered'])
        .order('created_at', { ascending: false });

      if (error) {
        printLog(`❌ Error fetching completed orders: ${error}`, true);
        callbacksRef.current.onError?.(error);
      } else {
        const typedData = data as unknown as OrderProps[];
        setCompletedOrders(typedData || []);
        printLog(`🟡 Completed orders fetched: ${typedData?.length || 0} orders`);
      }
    } catch (error) {
      printLog(`❌ Error: ${error}`, true);
      callbacksRef.current.onError?.(error);
    }
  }, [riderId]);

  // Fetch tutti gli ordini
  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAvailableOrders(),
        fetchAssignedOrders(),
        fetchCompletedOrders()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchAvailableOrders, fetchAssignedOrders, fetchCompletedOrders]);

  // Assegna un ordine al rider
  const assignOrderToRider = useCallback(async (orderId: string) => {
    if (!riderId) {
      throw new Error('Rider ID is required to assign orders');
    }

    try {
      printLog(`🔍 Attempting to assign order ${orderId} to rider ${riderId}`);

      // Chiama l'API endpoint per assegnare l'ordine
      const response = await fetch('/api/orders/assign-to-rider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          riderId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign order');
      }

      if (!result.success) {
        throw new Error(result.error || 'Order assignment failed');
      }

      // Aggiorna gli stati locali
      const updatedOrder = result.data as OrderProps;
      
      setAvailableOrders(prev => prev.filter(order => order.id !== orderId));
      setAssignedOrders(prev => [updatedOrder, ...prev]);

      printLog(`🟡 Order ${orderId} assigned to rider ${riderId}`);
      return { success: true, data: updatedOrder };
    } catch (error) {
      printLog(`❌ Error assigning order: ${error}`, true);
      callbacksRef.current.onError?.(error);
      return { success: false, error };
    }
  }, [riderId]);

  // Completa un ordine
  const completeOrder = useCallback(async (orderId: string) => {
    if (!riderId) {
      throw new Error('Rider ID is required to complete orders');
    }

    try {
      printLog(`🔍 Attempting to complete order ${orderId} by rider ${riderId}`);

      // Chiama l'API endpoint per completare l'ordine
      const response = await fetch('/api/orders/complete-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          riderId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete order');
      }

      if (!result.success) {
        throw new Error(result.error || 'Order completion failed');
      }

      // Aggiorna gli stati locali
      const updatedOrder = result.data as OrderProps;
      
      setAssignedOrders(prev => prev.filter(order => order.id !== orderId));
      setCompletedOrders(prev => [updatedOrder, ...prev]);

      printLog(`🟡 Order ${orderId} completed by rider ${riderId}`);
      return { success: true, data: updatedOrder };
    } catch (error) {
      printLog(`❌ Error completing order: ${error}`, true);
      callbacksRef.current.onError?.(error);
      return { success: false, error };
    }
  }, [riderId]);

  // Gestione eventi real-time
  const handleOrderChange = useCallback((payload: any) => {
    const order = payload.new as OrderProps;
    const oldOrder = payload.old as OrderProps;
    
    if (payload.eventType === 'INSERT') {
      // Nuovo ordine - aggiungi agli disponibili se è delivery e senza driver
      if (order.is_delivery && !order.driver_id) {
        setAvailableOrders(prev => {
          const exists = prev.some(o => o.id === order.id);
          if (!exists) {
            return [...prev, order];
          }
          return prev;
        });
      }
      callbacksRef.current.onOrderInsert?.(order);
    } 
    else if (payload.eventType === 'UPDATE') {
      // Aggiornamento ordine
      const orderId = order.id;
      
      // Se l'ordine è stato assegnato a questo rider
      if (order.driver_id === riderId && oldOrder.driver_id !== riderId) {
        setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
        setAssignedOrders(prev => {
          const exists = prev.some(o => o.id === orderId);
          if (!exists) {
            return [order, ...prev];
          }
          return prev.map(o => o.id === orderId ? order : o);
        });
      }
      // Se l'ordine è stato completato da questo rider
      else if (order.driver_id === riderId && (order.status === 'completed' || order.status === 'delivered')) {
        setAssignedOrders(prev => prev.filter(o => o.id !== orderId));
        setCompletedOrders(prev => {
          const exists = prev.some(o => o.id === orderId);
          if (!exists) {
            return [order, ...prev];
          }
          return prev.map(o => o.id === orderId ? order : o);
        });
      }
      // Se l'ordine è stato rimosso da questo rider
      else if (oldOrder.driver_id === riderId && order.driver_id !== riderId) {
        setAssignedOrders(prev => prev.filter(o => o.id !== orderId));
        if (order.is_delivery && !order.driver_id) {
          setAvailableOrders(prev => {
            const exists = prev.some(o => o.id === orderId);
            if (!exists) {
              return [...prev, order];
            }
            return prev;
          });
        }
      }
      // Aggiorna l'ordine nella lista appropriata
      else {
        setAvailableOrders(prev => 
          prev.map(o => o.id === orderId ? order : o)
        );
        setAssignedOrders(prev => 
          prev.map(o => o.id === orderId ? order : o)
        );
        setCompletedOrders(prev => 
          prev.map(o => o.id === orderId ? order : o)
        );
      }
      
      callbacksRef.current.onOrderUpdate?.(order);
    }
    else if (payload.eventType === 'DELETE') {
      const deletedId = oldOrder.id;
      setAvailableOrders(prev => prev.filter(o => o.id !== deletedId));
      setAssignedOrders(prev => prev.filter(o => o.id !== deletedId));
      setCompletedOrders(prev => prev.filter(o => o.id !== deletedId));
      callbacksRef.current.onOrderDelete?.(deletedId);
    }
  }, [riderId]);

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled || isSubscribedRef.current) {
      return;
    }

    const setupRealtimeSubscription = async () => {
      try {
        printLog(`🟡 Setting up rider realtime subscription...`);
        const supabase = supabaseClient();
        if (!supabase) {
          throw new Error('Failed to initialize Supabase client');
        }
        
        const channelName = `rider_orders_realtime_${Date.now()}`;
        
        const subscription = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders'
            },
            handleOrderChange
          )
          .subscribe((status) => {
            printLog(`🟡 Rider realtime subscription status: ${status}`);
            setIsConnected(status === 'SUBSCRIBED');
          });

        subscriptionRef.current = subscription;
        isSubscribedRef.current = true;
      } catch (error) {
        printLog(`❌ Error setting up rider realtime subscription: ${error}`, true);
        callbacksRef.current.onError?.(error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [enabled, handleOrderChange]);

  // Fetch iniziale
  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // Cleanup al dismount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, []);


  return {
    availableOrders,
    assignedOrders,
    completedOrders,
    loading,
    isConnected,
    assignOrderToRider,
    completeOrder,
    refetch: fetchAllOrders,
    refetchAvailable: fetchAvailableOrders,
    refetchAssigned: fetchAssignedOrders,
    refetchCompleted: fetchCompletedOrders
  };
}
