import {
    getOrdersOptimized,
    getOrdersOptimizedWithCache,
    getOrderStats,
    getOrdersWithCursor,
    getOrdersWithProducts,
    OrderFilters,
    PaginationParams,
    QueryResult
} from "@/lib/optimized-queries";
import { printLog } from "@/lib/utils";
import { OrderProps } from "@/types/types";
import { useCallback, useEffect, useState } from "react";

interface UseOptimizedOrdersOptions {
  // Configurazione base
  userId?: string;
  enabled?: boolean;
  
  // Filtri
  filters?: OrderFilters;
  
  // Pagination
  pagination?: PaginationParams;
  
  // Opzioni di query
  includeProducts?: boolean; // Se true, usa getOrdersWithProducts
  useCursorPagination?: boolean; // Se true, usa cursor-based pagination
  enableCache?: boolean; // Se true, abilita il caching
  
  // Callbacks
  onDataChange?: (orders: OrderProps[]) => void;
  onError?: (error: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

interface UseOptimizedOrdersReturn {
  // Dati
  orders: OrderProps[];
  stats: {
    totalOrders: number;
    todayOrders: number;
    pendingOrders: number;
    userOrders: number;
  };
  
  // Stato
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor?: string;
  
  // Funzioni
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (newFilters: OrderFilters) => void;
  updatePagination: (newPagination: PaginationParams) => void;
  
  // Funzioni helper
  getOrdersByStatus: (status: OrderProps['status']) => OrderProps[];
  getTodayOrders: () => OrderProps[];
  getPendingOrders: () => OrderProps[];
  getCompletedOrders: () => OrderProps[];
  getCancelledOrders: () => OrderProps[];
}

export function useOptimizedOrders(options: UseOptimizedOrdersOptions = {}): UseOptimizedOrdersReturn {
  const {
    userId,
    enabled = true,
    filters = {},
    pagination = { page: 1, limit: 20 },
    includeProducts = false,
    useCursorPagination = false,
    enableCache = true,
    onDataChange,
    onError,
    onLoadingChange
  } = options;

  // Stato
  const [orders, setOrders] = useState<OrderProps[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0,
    userOrders: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [currentFilters, setCurrentFilters] = useState<OrderFilters>(filters);
  const [currentPagination, setCurrentPagination] = useState<PaginationParams>(pagination);

  // Funzione per aggiornare lo stato di loading
  const updateLoading = useCallback((newLoading: boolean) => {
    setLoading(newLoading);
    onLoadingChange?.(newLoading);
  }, [onLoadingChange]);

  // Funzione per gestire gli errori
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
    printLog(`❌ Optimized orders error: ${errorMessage}`, true);
  }, [onError]);

  // Funzione principale per caricare gli ordini
  const fetchOrders = useCallback(async (isLoadMore = false) => {
    if (!enabled) return;

    try {
      updateLoading(true);
      setError(null);

      let result: QueryResult<OrderProps>;

      // Scegli la funzione di query appropriata
      if (enableCache && !currentFilters.userId) {
        // Usa versione con cache per query non-user-specific
        result = await getOrdersOptimizedWithCache(
          currentFilters,
          currentPagination
        );
      } else if (useCursorPagination) {
        // Usa cursor-based pagination
        result = await getOrdersWithCursor(
          isLoadMore ? nextCursor : undefined,
          currentPagination.limit,
          currentFilters
        );
      } else if (includeProducts) {
        // Usa query con prodotti completi
        result = await getOrdersWithProducts(
          currentFilters,
          currentPagination
        );
      } else {
        // Usa query ottimizzata standard
        result = await getOrdersOptimized(
          currentFilters,
          currentPagination
        );
      }

      if (result.error) {
        handleError(result.error);
        return;
      }

      // Aggiorna gli ordini
      if (isLoadMore) {
        setOrders(prev => [...prev, ...result.data]);
      } else {
        setOrders(result.data);
      }

      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);

      // Notifica il cambiamento dei dati
      onDataChange?.(isLoadMore ? [...orders, ...result.data] : result.data);

      printLog(`✅ Optimized orders fetched: ${result.data.length} orders, hasMore: ${result.hasMore}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      handleError(errorMessage);
    } finally {
      updateLoading(false);
    }
  }, [
    enabled,
    currentFilters,
    currentPagination,
    includeProducts,
    useCursorPagination,
    enableCache,
    nextCursor,
    orders,
    onDataChange,
    updateLoading,
    handleError
  ]);

  // Funzione per caricare le statistiche
  const fetchStats = useCallback(async () => {
    if (!enabled) return;

    try {
      const statsData = await getOrderStats(userId);
      setStats(statsData);
      printLog(`✅ Stats fetched: ${JSON.stringify(statsData)}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      printLog(`❌ Error fetching stats: ${errorMessage}`, true);
    }
  }, [enabled, userId]);

  // Funzione per caricare più dati (pagination)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    if (useCursorPagination) {
      // Per cursor-based pagination, usa il cursor esistente
      await fetchOrders(true);
    } else {
      // Per offset-based pagination, incrementa la pagina
      const newPagination = {
        ...currentPagination,
        page: currentPagination.page + 1
      };
      setCurrentPagination(newPagination);
      // Il fetchOrders verrà chiamato automaticamente dal useEffect
    }
  }, [loading, hasMore, useCursorPagination, currentPagination, fetchOrders]);

  // Funzione per aggiornare i filtri
  const updateFilters = useCallback((newFilters: OrderFilters) => {
    setCurrentFilters(newFilters);
    // Reset pagination quando cambiano i filtri
    setCurrentPagination({ page: 1, limit: currentPagination.limit });
    setNextCursor(undefined);
  }, [currentPagination.limit]);

  // Funzione per aggiornare la pagination
  const updatePagination = useCallback((newPagination: PaginationParams) => {
    setCurrentPagination(newPagination);
    setNextCursor(undefined);
  }, []);

  // Funzione per ricaricare i dati
  const refetch = useCallback(async () => {
    setNextCursor(undefined);
    setCurrentPagination({ page: 1, limit: currentPagination.limit });
    await fetchOrders();
    await fetchStats();
  }, [fetchOrders, fetchStats, currentPagination.limit]);

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

  // Effetti per sincronizzare i props con lo stato interno
  useEffect(() => {
    setCurrentFilters(filters);
  }, [filters]);

  useEffect(() => {
    setCurrentPagination(pagination);
  }, [pagination]);

  // Effetto principale per caricare i dati
  useEffect(() => {
    if (enabled) {
      fetchOrders();
      fetchStats();
    }
  }, [enabled, currentFilters, currentPagination, fetchOrders, fetchStats]);

  // Cleanup quando il componente si smonta
  useEffect(() => {
    return () => {
      setOrders([]);
      setStats({
        totalOrders: 0,
        todayOrders: 0,
        pendingOrders: 0,
        userOrders: 0
      });
    };
  }, []);

  return {
    // Dati
    orders,
    stats,
    
    // Stato
    loading,
    error,
    hasMore,
    nextCursor,
    
    // Funzioni
    refetch,
    loadMore,
    updateFilters,
    updatePagination,
    
    // Funzioni helper
    getOrdersByStatus,
    getTodayOrders,
    getPendingOrders,
    getCompletedOrders,
    getCancelledOrders
  };
}

// Hook di convenienza per admin
export function useAdminOptimizedOrders(options: Omit<UseOptimizedOrdersOptions, 'userId'> = {}) {
  return useOptimizedOrders({
    ...options,
    filters: {
      ...options.filters,
      // Admin può vedere tutti gli ordini
    }
  });
}

// Hook di convenienza per customer
export function useCustomerOptimizedOrders(
  userId: string, 
  options: Omit<UseOptimizedOrdersOptions, 'userId' | 'filters'> = {}
) {
  return useOptimizedOrders({
    ...options,
    userId,
    filters: {
      ...(options as any).filters,
      userId // Filtra sempre per l'utente corrente
    }
  });
}

// Hook per statistiche standalone
export function useOrderStats(userId?: string) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0,
    userOrders: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await getOrderStats(userId);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}
