import { DEBOUNCE_DELAY } from "@/utils/performance";
import { useCallback, useEffect, useRef, useState } from "react";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseOptimizedQueryOptions {
  enabled?: boolean;
  debounceMs?: number;
  cacheKey?: string;
  staleTime?: number;
}

export function useOptimizedQuery<T>(
  queryFn: () => Promise<T>,
  options: UseOptimizedQueryOptions = {}
) {
  const {
    enabled = true,
    debounceMs = DEBOUNCE_DELAY,
    cacheKey,
    staleTime = 5 * 60 * 1000, // 5 minuti
  } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastFetchRef = useRef<number>(0);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    // Controlla cache se disponibile
    if (cacheKey && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      const now = Date.now();
      
      if (now - cached.timestamp < staleTime) {
        setState({ data: cached.data, loading: false, error: null });
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await queryFn();
      const now = Date.now();
      
      // Salva in cache se disponibile
      if (cacheKey) {
        cacheRef.current.set(cacheKey, { data, timestamp: now });
      }
      
      lastFetchRef.current = now;
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [queryFn, enabled, cacheKey, staleTime]);

  const refetch = useCallback(() => {
    // Cancella il timeout esistente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Esegui immediatamente se non c'è debounce
    if (debounceMs === 0) {
      executeQuery();
      return;
    }

    // Altrimenti applica debounce
    timeoutRef.current = setTimeout(() => {
      executeQuery();
    }, debounceMs);
  }, [executeQuery, debounceMs]);

  // Esegui query quando cambiano le dipendenze
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const invalidateCache = useCallback(() => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
  }, [cacheKey]);

  return {
    ...state,
    refetch,
    invalidateCache,
  };
}

// Hook per query che dipendono da parametri
export function useOptimizedQueryWithParams<T, P>(
  queryFn: (params: P) => Promise<T>,
  params: P,
  options: UseOptimizedQueryOptions = {}
) {
  const queryWithParams = useCallback(() => queryFn(params), [queryFn, params]);
  
  return useOptimizedQuery(queryWithParams, {
    ...options,
    cacheKey: options.cacheKey ? `${options.cacheKey}_${JSON.stringify(params)}` : undefined,
  });
} 