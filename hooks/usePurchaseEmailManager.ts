import { createClientSupabase } from '@/lib/supabase';
import { printLog } from '@/lib/utils';
import { useCallback, useRef, useState } from 'react';

interface UsePurchaseEmailManagerProps {
  userId?: string;
}

export const usePurchaseEmailManager = ({ userId }: UsePurchaseEmailManagerProps) => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const processedOrdersRef = useRef<Set<string>>(new Set());

  const sendPurchaseEmailForOrder = useCallback(async (orderId: string, forceCheck = false): Promise<boolean> => {
    if (!userId) {
      printLog(`❌ Cannot send email: no userId provided for order ${orderId}`, true);
      return false;
    }

    // Prevent multiple simultaneous calls for the same order
    if (sendingRef.current) {
      printLog(`📧 Email send already in progress, skipping order ${orderId}...`);
      return false;
    }

    // If we've already processed this order in this session, skip
    if (!forceCheck && processedOrdersRef.current.has(orderId)) {
      printLog(`📧 Order ${orderId} already processed in this session, skipping...`);
      return true;
    }

    sendingRef.current = true;
    setIsSending(true);
    setError(null);

    try {
      const supabase = createClientSupabase();
      
      // CRITICAL: Check if email was already sent
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("is_email_sent")
        .eq("id", orderId)
        .single();

      if (orderError) {
        printLog(`❌ Error checking order email status: ${orderError.message}`, true);
        return false;
      }

      if (orderData?.is_email_sent === true) {
        printLog(`📧 Email already sent for order ${orderId}, SKIPPING COMPLETELY...`);
        processedOrdersRef.current.add(orderId);
        return true;
      }

      printLog(`📧 Email not sent yet for order ${orderId}, proceeding with send...`);

      // IMMEDIATELY mark as sending to prevent race conditions
      const { error: markError } = await supabase
        .from("orders")
        .update({ is_email_sent: true })
        .eq("id", orderId)
        .eq("is_email_sent", false); // Only update if not already sent

      if (markError) {
        printLog(`❌ Failed to mark order as email sending: ${markError.message}`, true);
        return false;
      }

      // Get user data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        throw new Error(`Could not fetch user data: ${userError?.message || 'User not found'}`);
      }

      // Send email
      const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
      const emailResponse = await fetch(`${baseUrl}/api/resend/purchase-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: userData.name || 'Cliente',
          orderId: orderId,
          email: userData.email
        })
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        throw new Error(`Email API error: ${emailResponse.status} - ${errorData.error || 'Unknown error'}`);
      }

      printLog(`✅ Purchase confirmation email sent successfully for order ${orderId}`);
      processedOrdersRef.current.add(orderId);
      return true;

    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      printLog(`❌ Error sending purchase confirmation email: ${errorMessage}`, true);
      setError(errorMessage);
      
      // If email failed, we should revert the is_email_sent flag
      try {
        const supabase = createClientSupabase();
        await supabase
          .from("orders")
          .update({ is_email_sent: false })
          .eq("id", orderId);
        printLog(`🔄 Reverted is_email_sent flag for order ${orderId} due to email failure`);
      } catch (revertError) {
        printLog(`❌ Failed to revert is_email_sent flag: ${revertError}`, true);
      }
      
      return false;
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }, [userId]);

  const sendEmailForMostRecentOrder = useCallback(async (orders: any[]): Promise<boolean> => {
    if (!orders || orders.length === 0) {
      printLog(`📧 No orders available for email sending`);
      return false;
    }

    // Get the most recent order
    const mostRecentOrder = orders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    if (!mostRecentOrder) {
      printLog(`📧 No valid order found for email sending`);
      return false;
    }

    printLog(`📧 Attempting to send email for most recent order ${mostRecentOrder.id}`);
    return await sendPurchaseEmailForOrder(mostRecentOrder.id);
  }, [sendPurchaseEmailForOrder]);

  const clearProcessedOrders = useCallback(() => {
    processedOrdersRef.current.clear();
    printLog(`📧 Cleared processed orders cache`);
  }, []);

  return {
    sendPurchaseEmailForOrder,
    sendEmailForMostRecentOrder,
    clearProcessedOrders,
    isSending,
    error
  };
};
