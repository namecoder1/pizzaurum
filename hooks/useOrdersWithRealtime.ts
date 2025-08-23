// DEPRECATED: Questo hook è stato sostituito da useUnifiedOrdersRealtime
// Per favore usa useCustomerOrdersWithRealtime dal nuovo file

import { OrderProps } from "@/types/types";
import { useCustomerOrdersWithRealtime } from './useUnifiedOrdersRealtime';

interface UseOrdersWithRealtimeOptions {
  userId: string;
  enabled?: boolean;
  onOrderInsert?: (order: OrderProps) => void;
  onOrderUpdate?: (order: OrderProps) => void;
  onOrderDelete?: (orderId: string) => void;
  onError?: (error: any) => void;
}

export function useOrdersWithRealtime(options: UseOrdersWithRealtimeOptions) {
  console.warn('useOrdersWithRealtime è deprecato. Usa useCustomerOrdersWithRealtime da useUnifiedOrdersRealtime.ts');
  
  const { userId, ...restOptions } = options;
  return useCustomerOrdersWithRealtime(userId, restOptions);
} 