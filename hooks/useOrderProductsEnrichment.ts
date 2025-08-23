import { getOrderProductsInfo, needsEnrichment } from '@/lib/order-helpers';
import { OrderProductProps, OrderProps } from '@/types/types';
import { useEffect, useMemo, useState } from 'react';

interface UseOrderProductsEnrichmentProps {
  products: OrderProductProps[];
  enabled?: boolean;
}

interface UseOrderProductsEnrichmentForOrdersProps {
  orders: OrderProps[];
  enabled?: boolean;
}

export const useOrderProductsEnrichment = ({ products, enabled = true }: UseOrderProductsEnrichmentProps) => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<OrderProductProps[]>([]);

  // Use useMemo to compute enriched products without causing re-renders
  const enrichedProducts = useMemo(() => {
    if (!enabled || !products || products.length === 0) {
      return products;
    }

    // If products don't need enrichment, return them as is
    if (!needsEnrichment(products)) {
      return products;
    }

    // If we have enriched data, use it
    if (enrichedData.length > 0) {
      return enrichedData;
    }

    // Otherwise return original products (will be enriched asynchronously)
    return products;
  }, [products, enabled, enrichedData]);

  // Async enrichment effect
  useEffect(() => {
    if (!enabled || !products || products.length === 0) {
      return;
    }

    if (!needsEnrichment(products)) {
      return;
    }

    // If we already have enriched data, don't enrich again
    if (enrichedData.length > 0) {
      return;
    }

    const enrichProducts = async () => {
      setIsEnriching(true);
      try {
        const enriched = await getOrderProductsInfo(products);
        setEnrichedData(enriched);
      } catch (error) {
        console.error('Error enriching products:', error);
        setEnrichedData(products); // Fallback to original products
      } finally {
        setIsEnriching(false);
      }
    };

    enrichProducts();
  }, [products, enabled, enrichedData]);

  return {
    enrichedProducts,
    isEnriching,
  };
};

// New hook for enriching products for multiple orders while preserving order structure
export const useOrderProductsEnrichmentForOrders = ({ orders, enabled = true }: UseOrderProductsEnrichmentForOrdersProps) => {
  const [isEnriching, setIsEnriching] = useState(false);
  // Cache dei prodotti arricchiti per orderId
  const [enrichedProductsByOrderId, setEnrichedProductsByOrderId] = useState<Record<string, OrderProductProps[]>>({});

  // Ricostruisci sempre gli ordini a partire da quelli realtime, sostituendo solo i products se arricchiti
  const enrichedOrders = useMemo(() => {
    if (!enabled || !orders || orders.length === 0) {
      return orders;
    }

    return orders.map((order) => {
      if (!order.products || order.products.length === 0) {
        return order;
      }

      // Se non serve arricchimento, lascia i prodotti così come sono
      if (!needsEnrichment(order.products)) {
        return order;
      }

      const enriched = enrichedProductsByOrderId[order.id];
      if (!enriched) {
        return order;
      }

      // Ritorna un nuovo oggetto ordine con i prodotti arricchiti, mantenendo tutti gli altri campi aggiornati (status incluso)
      return {
        ...order,
        products: enriched,
      } as OrderProps;
    });
  }, [enabled, orders, enrichedProductsByOrderId]);

  // Effetto asincrono: arricchisci solo gli ordini che lo necessitano e non sono ancora in cache
  useEffect(() => {
    if (!enabled || !orders || orders.length === 0) {
      return;
    }

    const ordersNeedingEnrichment = orders.filter((order) => {
      if (!order.products || order.products.length === 0) return false;
      if (!needsEnrichment(order.products)) return false;
      return !enrichedProductsByOrderId[order.id];
    });

    if (ordersNeedingEnrichment.length === 0) {
      return;
    }

    let isCancelled = false;
    const enrich = async () => {
      setIsEnriching(true);
      try {
        const results = await Promise.all(
          ordersNeedingEnrichment.map(async (order) => {
            try {
              const enriched = await getOrderProductsInfo(order.products);
              return { orderId: order.id, products: enriched } as { orderId: string; products: OrderProductProps[] };
            } catch (e) {
              // In caso di errore, fallback ai prodotti originali per questo ordine
              return { orderId: order.id, products: order.products } as { orderId: string; products: OrderProductProps[] };
            }
          })
        );

        if (isCancelled) return;

        setEnrichedProductsByOrderId((prev) => {
          const next = { ...prev };
          for (const { orderId, products } of results) {
            next[orderId] = products;
          }
          return next;
        });
      } finally {
        if (!isCancelled) setIsEnriching(false);
      }
    };

    enrich();

    return () => {
      isCancelled = true;
    };
  }, [enabled, orders, enrichedProductsByOrderId]);

  return {
    enrichedOrders,
    isEnriching,
  };
};
