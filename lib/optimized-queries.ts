import { CustomerReviewProps, OrderProps, UserProps } from "@/types/types";
import { supabaseClient } from "./supabase-manager";

// ============================================================================
// TIPI PER LE QUERY OTTIMIZZATE
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  cursor?: string; // Per cursor-based pagination
}

export interface OrderFilters {
  status?: OrderProps['status'];
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  isDelivery?: boolean;
  paymentMethod?: OrderProps['payment'];
}

export interface QueryResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
  error?: string;
}

// ============================================================================
// QUERY OTTIMIZZATE PER ORDINI
// ============================================================================

/**
 * Query ottimizzata per gli ordini con pagination e filtri
 * 
 * INDICI RICHIESTI:
 * - orders(user_id, created_at DESC)
 * - orders(status, created_at DESC)
 * - orders(created_at DESC)
 * - orders(is_delivery, created_at DESC)
 * - orders(payment, created_at DESC)
 */
export async function getOrdersOptimized(
  filters: OrderFilters = {},
  pagination: PaginationParams = { page: 1, limit: 20 }
): Promise<QueryResult<OrderProps>> {
  try {
    const supabase = supabaseClient();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    // Inizia con i campi essenziali per ridurre il payload
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
        payment_issuer
      `, { count: 'exact' });

    // Applica filtri
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.isDelivery !== undefined) {
      query = query.eq('is_delivery', filters.isDelivery);
    }
    
    if (filters.paymentMethod) {
      query = query.eq('payment', filters.paymentMethod);
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Ordina per data di creazione (più recenti prima)
    query = query.order('created_at', { ascending: false });

    // Applica pagination
    const offset = (pagination.page - 1) * pagination.limit;
    query = query.range(offset, offset + pagination.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      // Gestisci specificamente l'errore di range
      if (error.code === 'PGRST103') {
        // Nessun dato per questo range, restituisci array vuoto
        return {
          data: [],
          count: count || 0,
          hasMore: false
        };
      }
      throw error;
    }

    const typedData = data as unknown as OrderProps[];
    const hasMore = count ? offset + pagination.limit < count : false;
    const nextCursor = hasMore ? typedData[typedData.length - 1]?.id : undefined;

    return {
      data: typedData || [],
      count: count || 0,
      hasMore,
      nextCursor
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return {
      data: [],
      count: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Query ottimizzata per ordini con prodotti completi
 * Usa solo quando necessario avere tutti i dettagli dei prodotti
 */
export async function getOrdersWithProducts(
  filters: OrderFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<QueryResult<OrderProps>> {
  try {
    const supabase = supabaseClient();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    // Query completa con prodotti (più pesante)
    // Nota: Rimuoviamo le relazioni per ora, dato che non sono definite nel database
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
      `, { count: 'exact' });

    // Applica gli stessi filtri
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.isDelivery !== undefined) {
      query = query.eq('is_delivery', filters.isDelivery);
    }
    
    if (filters.paymentMethod) {
      query = query.eq('payment', filters.paymentMethod);
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    query = query.order('created_at', { ascending: false });

    const offset = (pagination.page - 1) * pagination.limit;
    query = query.range(offset, offset + pagination.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const typedData = data as unknown as OrderProps[];
    const hasMore = count ? offset + pagination.limit < count : false;

    return {
      data: typedData || [],
      count: count || 0,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching orders with products:', error);
    return {
      data: [],
      count: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// QUERY OTTIMIZZATE PER STATISTICHE
// ============================================================================

/**
 * Query ottimizzata per le statistiche degli ordini
 * Evita di caricare tutti i dati quando servono solo i conteggi
 */
export async function getOrderStats(userId?: string) {
  try {
    const supabase = supabaseClient();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Query parallele per le statistiche
    const [totalOrders, todayOrders, pendingOrders, userOrders] = await Promise.all([
      // Totale ordini
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true }),
      
      // Ordini di oggi
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
        .lt('created_at', tomorrow),
      
      // Ordini in attesa
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'accepted']),
      
      // Ordini utente (se specificato)
      userId ? 
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId) :
        Promise.resolve({ count: 0 })
    ]);

    return {
      totalOrders: totalOrders.count || 0,
      todayOrders: todayOrders.count || 0,
      pendingOrders: pendingOrders.count || 0,
      userOrders: userOrders.count || 0
    };
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return {
      totalOrders: 0,
      todayOrders: 0,
      pendingOrders: 0,
      userOrders: 0
    };
  }
}

// ============================================================================
// QUERY OTTIMIZZATE PER UTENTI
// ============================================================================

/**
 * Query ottimizzata per profili utente
 * Seleziona solo i campi necessari
 */
export async function getUserProfilesOptimized(
  userIds: string[],
  fields: (keyof UserProps)[] = ['id', 'name', 'email']
): Promise<Record<string, Partial<UserProps>>> {
  try {
    if (userIds.length === 0) {
      return {};
    }

    const supabase = supabaseClient();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    // Query per tutti gli utenti in una volta sola
    const { data, error } = await supabase
      .from('users')
      .select(fields.join(', '))
      .in('id', userIds);

    if (error) {
      throw error;
    }

    // Converti in record per accesso rapido
    const userProfiles: Record<string, Partial<UserProps>> = {};
    (data as unknown as UserProps[]).forEach(user => {
      userProfiles[user.id] = user;
    });

    return userProfiles;
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    return {};
  }
}

// ============================================================================
// QUERY OTTIMIZZATE PER RECENSIONI
// ============================================================================

/**
 * Query ottimizzata per le recensioni con profili utente
 */
export async function getReviewsWithProfiles(
  limit: number = 4
): Promise<{ reviews: CustomerReviewProps[], userProfiles: Record<string, string> }> {
  try {
    const supabase = supabaseClient();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    // Fetch recensioni
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('orders')
      .select(`
        customer_review,
        id,
        user_id,
        created_at
      `)
      .not('customer_review', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (reviewsError) {
      throw reviewsError;
    }

    const reviews = reviewsData as unknown as CustomerReviewProps[];
    
    // Estrai user IDs unici
    const userIds = reviews
      .map(review => review.user_id)
      .filter((id): id is string => !!id);
    
    const uniqueUserIds = [...new Set(userIds)];

    // Fetch profili utente in batch
    const userProfiles = await getUserProfilesOptimized(
      uniqueUserIds,
      ['id', 'name']
    );

    return {
      reviews,
      userProfiles: Object.fromEntries(
        Object.entries(userProfiles).map(([id, user]) => [id, user.name || ''])
      )
    };
  } catch (error) {
    console.error('Error fetching reviews with profiles:', error);
    return {
      reviews: [],
      userProfiles: {}
    };
  }
}

// ============================================================================
// CURSOR-BASED PAGINATION
// ============================================================================

/**
 * Implementazione cursor-based pagination per performance ottimali
 */
export async function getOrdersWithCursor(
  cursor?: string,
  limit: number = 20,
  filters: OrderFilters = {}
): Promise<QueryResult<OrderProps>> {
  try {
    const supabase = supabaseClient();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

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
        payment_issuer
      `, { count: 'exact' });

    // Applica filtri
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.isDelivery !== undefined) {
      query = query.eq('is_delivery', filters.isDelivery);
    }
    
    if (filters.paymentMethod) {
      query = query.eq('payment', filters.paymentMethod);
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Cursor-based pagination
    if (cursor) {
      // Assumiamo che il cursor sia l'ID dell'ultimo ordine
      query = query.lt('id', cursor);
    }

    query = query.order('created_at', { ascending: false }).limit(limit + 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const typedData = data as unknown as OrderProps[];
    const hasMore = typedData.length > limit;
    const orders = hasMore ? typedData.slice(0, limit) : typedData;
    const nextCursor = hasMore ? orders[orders.length - 1]?.id : undefined;

    return {
      data: orders || [],
      count: count || 0,
      hasMore,
      nextCursor
    };
  } catch (error) {
    console.error('Error fetching orders with cursor:', error);
    return {
      data: [],
      count: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

// Cache in-memory per query frequenti
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function getCachedQuery<T>(key: string): T | null {
  const cached = queryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    queryCache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

export function setCachedQuery<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

export function clearQueryCache(): void {
  queryCache.clear();
}

// ============================================================================
// QUERY CON CACHE
// ============================================================================

/**
 * Versione con cache delle query ottimizzate
 */
export async function getOrdersOptimizedWithCache(
  filters: OrderFilters = {},
  pagination: PaginationParams = { page: 1, limit: 20 },
  cacheKey?: string
): Promise<QueryResult<OrderProps>> {
  const key = cacheKey || `orders_${JSON.stringify(filters)}_${JSON.stringify(pagination)}`;
  
  // Controlla cache per query non-user-specific
  if (!filters.userId) {
    const cached = getCachedQuery<QueryResult<OrderProps>>(key);
    if (cached) {
      return cached;
    }
  }

  const result = await getOrdersOptimized(filters, pagination);
  
  // Cache solo se non ci sono errori e non è user-specific
  if (!result.error && !filters.userId) {
    setCachedQuery(key, result, 2 * 60 * 1000); // 2 minuti
  }
  
  return result;
}
