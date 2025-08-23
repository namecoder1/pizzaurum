import { printLog } from '@/lib/utils';
import { OrderProps } from '@/types/types';
import { useEffect, useState } from 'react';

interface UseOrderFeesUpdaterProps {
  order: OrderProps | null;
  enabled?: boolean;
}

interface FeesUpdateResult {
  success: boolean;
  netProfit?: number;
  paymentIssuer?: string;
  error?: string;
}

export const useOrderFeesUpdater = ({ order, enabled = true }: UseOrderFeesUpdaterProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateResult, setLastUpdateResult] = useState<FeesUpdateResult | null>(null);

  useEffect(() => {
    const updateOrderFees = async () => {
      if (!enabled || !order || !order.stripe_payment_intent_id) {
        return;
      }

      // Skip if already has real data (not estimated)
      if (order.payment_issuer !== 'Unknown' && order.net_profit && order.net_profit > 0) {
        printLog(`Order ${order.id} already has real fees data, skipping update`);
        return;
      }

      setIsUpdating(true);
      setLastUpdateResult(null);

      try {
        printLog(`🔄 Updating fees for order ${order.id} with payment intent ${order.stripe_payment_intent_id}`);

        const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
        const response = await fetch(`${baseUrl}/api/stripe/update-net-profit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: order.id,
            paymentIntentId: order.stripe_payment_intent_id,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          printLog(`✅ Successfully updated fees for order ${order.id}: net_profit=${result.netProfitCents}, payment_issuer=${result.paymentIssuer}`);
          setLastUpdateResult({
            success: true,
            netProfit: result.netProfitCents,
            paymentIssuer: result.paymentIssuer,
          });
        } else {
          printLog(`❌ Failed to update fees for order ${order.id}: ${result.error}`, true);
          setLastUpdateResult({
            success: false,
            error: result.error || 'Unknown error',
          });
        }
      } catch (error) {
        printLog(`❌ Error updating fees for order ${order.id}: ${error}`, true);
        setLastUpdateResult({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsUpdating(false);
      }
    };

    // Add a small delay to avoid immediate updates
    const timeoutId = setTimeout(updateOrderFees, 1000);

    return () => clearTimeout(timeoutId);
  }, [order?.id, order?.stripe_payment_intent_id, order?.payment_issuer, order?.net_profit, enabled]);

  return {
    isUpdating,
    lastUpdateResult,
  };
};
