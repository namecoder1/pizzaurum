import { PushNotificationData, sendOrderStatusPushNotification } from "@/lib/push-notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { printLog } from "@/lib/utils";

// Helper functions for notification messages
function getNotificationTitle(status: string): string {
  switch (status) {
    case 'accepted':
      return 'Ordine confermato! 🎉';
    case 'preparing':
      return 'Ordine in preparazione! 👨‍🍳';
    case 'ready_to_pickup':
      return 'Ordine pronto! 🍕';
    case 'delivering':
      return 'Ordine in consegna! 🚚';
    case 'delivered':
    case 'completed':
      return 'Ordine consegnato! ✅';
    case 'cancelled':
    case 'failed':
      return 'Ordine annullato ❌';
    default:
      return 'Aggiornamento ordine';
  }
}

function getNotificationBody(status: string, orderNumber: string): string {
  switch (status) {
    case 'accepted':
      return `Il tuo ordine #${orderNumber} è stato confermato e verrà preparato presto.`;
    case 'preparing':
      return `Il tuo ordine #${orderNumber} è in preparazione.`;
    case 'ready_to_pickup':
      return `Il tuo ordine #${orderNumber} è pronto per il ritiro!`;
    case 'delivering':
      return `Il tuo ordine #${orderNumber} è in consegna.`;
    case 'delivered':
    case 'completed':
      return `Il tuo ordine #${orderNumber} è stato consegnato. Buon appetito!`;
    case 'cancelled':
    case 'failed':
      return `Il tuo ordine #${orderNumber} è stato annullato.`;
    default:
      return `Il tuo ordine #${orderNumber} ha un nuovo stato.`;
  }
}

let baseUrl: string

// Use APP_ENV if available, otherwise fallback to NODE_ENV
const currentEnv = process.env.APP_ENV || process.env.NODE_ENV

if (currentEnv === 'development') {
  baseUrl = 'http://localhost:8081'
} else {
  baseUrl = process.env.EXPO_PUBLIC_BASE_URL!
}

export async function POST(request: Request) {
  try {
    const { orderId, newStatus } = await request.json();

    if (!orderId || !newStatus) {
      return Response.json(
        { error: "Order ID and new status are required" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();
    if (!admin) {
      printLog("❌ Supabase admin client not initialized", true);
      return Response.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    // Get order details
    const { data: orderData, error: orderError } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) {
      printLog(`❌ Error fetching order: ${orderError}`, true);
      return Response.json(
        { error: "Failed to fetch order details" },
        { status: 500 }
      );
    }

    if (!orderData) {
      return Response.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Get user information separately
    const { data: userData, error: userError } = await admin
      .from("users")
      .select("phone, name, expo_push_token")
      .eq("id", (orderData as any).user_id)
      .single();

    if (userError) {
      printLog(`❌ Error fetching user: ${userError}`, true);
      // Continue without SMS if we can't get user data
    }

    // Update order status
    const { error: updateError } = await admin
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      printLog(`❌ Error updating order status: ${updateError}`, true);
      return Response.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // Check if we need to send SMS notifications
    const shouldSendSMS = (
      (orderData.is_delivery === false && newStatus === 'ready_to_pickup') ||
      (orderData.is_delivery === true && newStatus === 'delivering')
    );

    printLog(`📱 SMS check: is_delivery=${orderData.is_delivery}, newStatus=${newStatus}, shouldSendSMS=${shouldSendSMS}, hasPhone=${!!userData?.phone}`, true);

    if (shouldSendSMS && userData?.phone) {
      try {
        let message = '';
        
        if (orderData.is_delivery === false && newStatus === 'ready_to_pickup') {
          message = `Il tuo ordine #${orderId.slice(0, 8)} è pronto per il ritiro in sede`;
        } else if (orderData.is_delivery === true && newStatus === 'delivering') {
          message = `Il tuo ordine #${orderId.slice(0, 8)} è in consegna, aspetta una chiamata dal fattorino`;
        }

        // Send SMS notification
        const smsResponse = await fetch(`${baseUrl}/api/twilio/send-completed-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: userData.phone,
            message: message
          }),
        });

        if (!smsResponse.ok) {
          printLog(`⚠️ Failed to send SMS notification: ${smsResponse.status}`, true);
        } else {
          printLog(`✅ SMS notification sent successfully for order ${orderId}`, true);
        }
      } catch (smsError) {
        printLog(`❌ Error sending SMS notification: ${smsError}`, true);
        // Don't fail the entire request if SMS fails
      }
    }

    // Send push notification if user has expo push token
    if (userData?.expo_push_token) {
      try {
        const notificationData: PushNotificationData = {
          orderId: orderId,
          status: newStatus,
          orderNumber: orderId.slice(0, 8).toUpperCase(),
          title: getNotificationTitle(newStatus),
          body: getNotificationBody(newStatus, orderId.slice(0, 8).toUpperCase())
        };

        const pushSuccess = await sendOrderStatusPushNotification(
          userData.expo_push_token as string,
          notificationData
        );

        if (pushSuccess) {
          printLog(`✅ Push notification sent successfully for order ${orderId}`, true);
        } else {
          printLog(`⚠️ Failed to send push notification for order ${orderId}`, true);
        }
      } catch (pushError) {
        printLog(`❌ Error sending push notification: ${pushError}`, true);
        // Don't fail the entire request if push notification fails
      }
    } else {
      printLog(`📱 No expo push token found for user ${(orderData as any).user_id}`, true);
    }

    printLog(`✅ Order status updated successfully: ${orderId} -> ${newStatus}`, true);
    
    return Response.json({
      success: true,
      message: "Order status updated successfully",
      orderId,
      newStatus
    });

  } catch (error) {
    printLog(`❌ Error updating order status: ${error}`, true);
    return Response.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
