// sanity.ts
import { cleanProductName } from '@/lib/utils';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createQueryStore } from '@sanity/react-loader';
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { client } from '../sanity/client';

// Configurazione ottimizzata per le performance
const { useLiveMode, useQuery } = createQueryStore({ 
  client, 
  ssr: false
})

// Custom hook that automatically cleans product names
export const useCleanQuery = (query: string, params?: any) => {
  const result = useQuery(query, params);
  
  // Clean product names if the result contains products
  if (result.data && Array.isArray(result.data)) {
    const cleanedData = result.data.map((item: any) => {
      if (item && typeof item === 'object' && item.name) {
        return {
          ...item,
          name: cleanProductName(item.name)
        };
      }
      return item;
    });
    
    return {
      ...result,
      data: cleanedData
    };
  }
  
  return result;
};

export { useLiveMode, useQuery };

interface QueryCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

interface QueryState {
  data: any;
  loading: boolean;
  error: Error | null;
  lastFetch: number;
}

const CACHE_KEY = 'pizzaurum_query_cache';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minuti

// Funzioni helper per il storage
const saveCacheToStorage = async (cache: QueryCache) => {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } else {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.error("Error saving cache to storage:", error);
  }
};

const loadCacheFromStorage = async (): Promise<QueryCache> => {
  try {
    let cacheData: string | null = null;
    
    if (Platform.OS === "web" && typeof window !== "undefined") {
      cacheData = localStorage.getItem(CACHE_KEY);
    } else {
      cacheData = await AsyncStorage.getItem(CACHE_KEY);
    }
    
    if (cacheData) {
      return JSON.parse(cacheData);
    }
  } catch (error) {
    console.error("Error loading cache from storage:", error);
  }
  
  return {};
};

// Cache globale in memoria
const memoryCache: QueryCache = {};
let isCacheInitialized = false;

const initializeCache = async () => {
  if (!isCacheInitialized) {
    const storedCache = await loadCacheFromStorage();
    Object.assign(memoryCache, storedCache);
    isCacheInitialized = true;
  }
};

const getCachedData = (key: string): any | null => {
  const cached = memoryCache[key];
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    delete memoryCache[key];
    return null;
  }
  
  return cached.data;
};

const setCachedData = async (key: string, data: any, ttl: number = DEFAULT_TTL) => {
  memoryCache[key] = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  
  await saveCacheToStorage(memoryCache);
};

export function useQueryStore<T = any>(
  key: string,
  queryFn: () => Promise<T>,
  options: {
    enabled?: boolean;
    ttl?: number;
    refetchOnMount?: boolean;
  } = {}
) {
  const {
    enabled = true,
    ttl = DEFAULT_TTL,
    refetchOnMount = true,
  } = options;

  const [state, setState] = useState<QueryState>({
    data: null,
    loading: false,
    error: null,
    lastFetch: 0,
  });

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeQuery = useCallback(async (forceRefetch = false) => {
    if (!enabled) return;

    // Controlla cache se non è un refetch forzato
    if (!forceRefetch) {
      const cachedData = getCachedData(key);
      if (cachedData !== null) {
        setState(prev => ({
          ...prev,
          data: cachedData,
          loading: false,
          error: null,
          lastFetch: Date.now(),
        }));
        return;
      }
    }

    // Cancella query precedente se in corso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await queryFn();
      
      if (isMountedRef.current && !abortControllerRef.current.signal.aborted) {
        await setCachedData(key, data, ttl);
        setState({
          data,
          loading: false,
          error: null,
          lastFetch: Date.now(),
        });
      }
    } catch (error) {
      if (isMountedRef.current && !abortControllerRef.current.signal.aborted) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
      }
    }
  }, [key, queryFn, enabled, ttl]);

  const refetch = useCallback(() => {
    executeQuery(true);
  }, [executeQuery]);

  const invalidateCache = useCallback(async () => {
    delete memoryCache[key];
    await saveCacheToStorage(memoryCache);
  }, [key]);

  // Inizializza cache e carica dati
  useEffect(() => {
    initializeCache();
    
    if (enabled) {
      executeQuery();
    }
  }, [enabled, executeQuery]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    refetch,
    invalidateCache,
  };
}

// Hook per query con parametri
export function useQueryStoreWithParams<T = any, P = any>(
  key: string,
  queryFn: (params: P) => Promise<T>,
  params: P,
  options: {
    enabled?: boolean;
    ttl?: number;
    refetchOnMount?: boolean;
  } = {}
) {
  const queryWithParams = useCallback(() => queryFn(params), [queryFn, params]);
  const cacheKey = `${key}_${JSON.stringify(params)}`;
  
  return useQueryStore(cacheKey, queryWithParams, options);
}
