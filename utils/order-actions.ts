import { printLog } from "@/lib/utils";
import { OrderProps } from "@/types/types";

/**
 * Handle the deletion of an order
 * @param deleteOrder - The function to delete the order
 * @param orderId - The ID of the order to delete
 * @param onOrderStatusUpdated - The function to update the order status
 * @returns void
*/
export const handleDeleteOrder = async ({
  deleteOrder,
  orderId,
  onOrderStatusUpdated
}: {
  deleteOrder: (orderId: string) => Promise<null>
  orderId: string
  onOrderStatusUpdated?: (orderId: string, newStatus: OrderProps['status']) => void
}) => {
  try {
    await deleteOrder(orderId);
    // Update the order status to 'cancelled' instead of removing it
    onOrderStatusUpdated?.(orderId, 'cancelled');
  } catch (error) {
    console.error('Error deleting order:', error);
  }
};

/**
 * Handle the refund of an order
 * @param processRefund - The function to process the refund
 * @param orderId - The ID of the order to refund
 * @param currentUserId - The ID of the current user
 * @param isAdmin - Whether the current user is an admin
 * @param onOrderStatusUpdated - The function to update the order status
 * @returns void
*/
export const handleRefundOrder = async ({
  processRefund,
  orderId,
  currentUserId,
  isAdmin,
  onOrderStatusUpdated
}: {
  processRefund: (orderId: string, currentUserId: string, isAdmin: boolean) => Promise<void>
  orderId: string
  currentUserId: string
  isAdmin: boolean
  onOrderStatusUpdated?: (orderId: string, newStatus: OrderProps['status']) => void
}) => {
  try {
    await processRefund(orderId, currentUserId, isAdmin || false);
    // Update the order status to 'cancelled' and mark as refunded
    onOrderStatusUpdated?.(orderId, 'cancelled');
    printLog('Order refunded successfully');
  } catch (error) {
    printLog(`❌ Error refunding order: ${error}`, true)
    // TODO: Show error message to user
  }
};

/**
 * Determine if the refund button should be shown
 * @param order - The order to check
 * @param isAdmin - Whether the current user is an admin
 * @param currentUserId - The ID of the current user
 * @returns boolean
 */
export const shouldShowRefundButton = ({
  order,
  isAdmin,
  currentUserId
}: {
  order: OrderProps
  isAdmin: boolean
  currentUserId: string
}) => {
  if (!order) return false;
  
  // Non mostrare se l'ordine è completato
  if (order.status === 'completed') return false;
  
  // Se è admin, può sempre fare refund (tranne se completato)
  if (isAdmin) return true;
  
  // Se è cliente, può fare refund solo se:
  // 1. È il proprietario dell'ordine
  // 2. Lo status è "pending" 
  // 3. Il pagamento è online OPPURE è un ordine a ritiro
  if (currentUserId === order.user_id && 
      order.status === 'pending' &&
      (order.payment === 'online' || !order.is_delivery)) {
    return true;
  }
  
  // Per tutti gli altri casi (ordini cash, ordini non suoi, stati avanzati)
  return false;
};

/**
 * Handle the refund button press
 * @param onRefundOrder - The function to handle the refund
 * @param orderId - The ID of the order to refund
 * @returns void
 */
export const handleRefundButtonPress = ({
  onRefundOrder,
  orderId
}: {
  onRefundOrder?: (orderId: string) => void
  orderId: string
}) => {
  onRefundOrder?.(orderId);
};