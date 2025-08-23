import { useCleanQuery } from "@/hooks/useQueryStore";
import { DRINKS_QUERY, OTHERS_QUERY, PIZZAS_QUERY, PIZZAURUMS_QUERY, SPIANATAS_QUERY } from "@/sanity/queries";
import { AnalyticsData, ProductProps, SpianataProps } from "@/types/types";

// Cache store for Sanity data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface SanityCache {
  pizzas?: CacheEntry<ProductProps[]>;
  pizzaurums?: CacheEntry<ProductProps[]>;
  drinks?: CacheEntry<ProductProps[]>;
  others?: CacheEntry<ProductProps[]>;
  spianatas?: CacheEntry<SpianataProps[]>;
}

const cache: Record<string, CacheEntry<any>> = {};
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds

// Helper function to check if cache is valid
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

// Helper function to get cached data or null if invalid
const getCachedData = <T>(key: string): T | null => {
  const entry = cache[key];
  if (entry && isCacheValid(entry.timestamp)) {
    return entry.data as T;
  }
  return null;
};

// Helper function to set cache data
const setCacheData = <T>(key: string, data: T): void => {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
};

// Custom hook for cached Sanity data
export const useSanityData = () => {
  const { data: pizzasData, loading: pizzasLoading } = useCleanQuery(PIZZAS_QUERY) as { data: ProductProps[], loading: boolean };
  const { data: pizzaurumsData, loading: pizzaurumsLoading } = useCleanQuery(PIZZAURUMS_QUERY) as { data: ProductProps[], loading: boolean };
  const { data: drinksData, loading: drinksLoading } = useCleanQuery(DRINKS_QUERY) as { data: ProductProps[], loading: boolean };
  const { data: othersData, loading: othersLoading } = useCleanQuery(OTHERS_QUERY) as { data: ProductProps[], loading: boolean };
  const { data: spianatasData, loading: spianatasLoading } = useCleanQuery(SPIANATAS_QUERY) as { data: SpianataProps[], loading: boolean };

  // Update cache when new data arrives
  if (pizzasData && !pizzasLoading) {
    setCacheData('pizzas', pizzasData);
  }
  if (pizzaurumsData && !pizzaurumsLoading) {
    setCacheData('pizzaurums', pizzaurumsData);
  }
  if (drinksData && !drinksLoading) {
    setCacheData('drinks', drinksData);
  }
  if (othersData && !othersLoading) {
    setCacheData('others', othersData);
  }
  if (spianatasData && !spianatasLoading) {
    setCacheData('spianatas', spianatasData);
  }

  return {
    // Return cached data if available, otherwise return fresh data
    pizzas: getCachedData<ProductProps[]>('pizzas') || pizzasData || [],
    pizzaurums: getCachedData<ProductProps[]>('pizzaurums') || pizzaurumsData || [],
    drinks: getCachedData<ProductProps[]>('drinks') || drinksData || [],
    others: getCachedData<ProductProps[]>('others') || othersData || [],
    spianatas: getCachedData<SpianataProps[]>('spianatas') || spianatasData || [],
    loading: pizzasLoading || pizzaurumsLoading || drinksLoading || othersLoading || spianatasLoading
  };
};

// Utility functions
export const isTopProduct = (productId: string, analyticsData: AnalyticsData) => {
  if (!analyticsData?.topProducts) return false;
  return analyticsData.topProducts.some(topProduct => topProduct.id === productId);
};

export const getTopProductPosition = (productId: string, analyticsData: AnalyticsData) => {
  if (!analyticsData?.topProducts) return null;
  const index = analyticsData.topProducts.findIndex(topProduct => topProduct.id === productId);
  return index >= 0 ? index + 1 : null;
};

// Function to get all products (to be used with the hook)
export const getAllProducts = (sanityData: ReturnType<typeof useSanityData>) => {
  return [
    ...(sanityData.pizzas || []),
    ...(sanityData.pizzaurums || []),
    ...(sanityData.drinks || []),
    ...(sanityData.others || []),
    ...(sanityData.spianatas || [])
  ];
};

// Function to clear cache (useful for testing or manual refresh)
export const clearSanityCache = () => {
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
};
