import { createClientSupabase } from '@/lib/supabase';
import { printLog } from '@/lib/utils';
import { useRef, useState } from 'react';

interface UseEmailSenderProps {
  userId: string;
  orderId: string;
}

export const useEmailSender = ({ userId, orderId }: UseEmailSenderProps) => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSent, setHasSent] = useState(false);
  const sendingRef = useRef(false); // Use ref to prevent race conditions

  const sendPurchaseEmail = async (): Promise<boolean> => {
    // Prevent multiple simultaneous calls using ref
    if (sendingRef.current || hasSent) {
      printLog(`📧 Email send already in progress or completed for order ${orderId}, skipping...`);
      return hasSent;
    }

    sendingRef.current = true;
    setIsSending(true);
    setError(null);

    try {
      // CRITICAL: Check if email was already sent BEFORE doing anything else
      const supabase = createClientSupabase();
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
        setHasSent(true);
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
      setHasSent(true);
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
  };

  return {
    sendPurchaseEmail,
    isSending,
    error,
    hasSent
  };
};
