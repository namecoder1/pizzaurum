import { createClientSupabase } from '@/lib/supabase';
import { printLog } from '@/lib/utils';
import { useCallback } from 'react';

interface UseImmediatePurchaseEmailProps {
  userId?: string;
}

export const useImmediatePurchaseEmail = ({ userId }: UseImmediatePurchaseEmailProps) => {
  const sendImmediatePurchaseEmail = useCallback(async (orderId: string): Promise<boolean> => {
    if (!userId) {
      printLog(`❌ Cannot send immediate email: no userId provided for order ${orderId}`, true);
      return false;
    }

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
        printLog(`📧 Email already sent for order ${orderId}, skipping immediate send...`);
        return true;
      }

      printLog(`📧 Sending immediate email for order ${orderId}...`);

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

      printLog(`✅ Immediate purchase confirmation email sent successfully for order ${orderId}`);
      return true;

    } catch (emailError) {
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      printLog(`❌ Error sending immediate purchase confirmation email: ${errorMessage}`, true);
      
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
    }
  }, [userId]);

  return {
    sendImmediatePurchaseEmail
  };
};
