// DEPRECATED: Questo hook è stato sostituito da useUnifiedOrdersRealtime
// Per favore usa useRealtimeOrdersOnly dal nuovo file

import { OrderProps } from "@/types/types";
import { useRealtimeOrdersOnly } from './useUnifiedOrdersRealtime';

interface UseRealtimeOrdersOptions {
  enabled?: boolean;
  onOrderInsert?: (order: OrderProps) => void;
  onOrderUpdate?: (order: OrderProps) => void;
  onOrderDelete?: (orderId: string) => void;
}

export function useRealtimeOrders(options: UseRealtimeOrdersOptions = {}) {
  console.warn('useRealtimeOrders è deprecato. Usa useRealtimeOrdersOnly da useUnifiedOrdersRealtime.ts');
  
  return useRealtimeOrdersOnly(options);
} 