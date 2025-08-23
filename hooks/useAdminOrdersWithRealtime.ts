// DEPRECATED: Questo hook è stato sostituito da useUnifiedOrdersRealtime
// Per favore usa useAdminOrdersWithRealtime dal nuovo file

import { OrderProps } from "@/types/types";
import { useAdminOrdersWithRealtime as useAdminOrdersWithRealtimeNew } from './useUnifiedOrdersRealtime';

interface UseAdminOrdersWithRealtimeOptions {
  enabled?: boolean;
  onOrderInsert?: (order: OrderProps) => void;
  onOrderUpdate?: (order: OrderProps) => void;
  onOrderDelete?: (orderId: string) => void;
  onError?: (error: any) => void;
}

export function useAdminOrdersWithRealtime(options: UseAdminOrdersWithRealtimeOptions = {}) {
  console.warn('useAdminOrdersWithRealtime è deprecato. Usa useAdminOrdersWithRealtime da useUnifiedOrdersRealtime.ts');
  
  return useAdminOrdersWithRealtimeNew(options);
} 