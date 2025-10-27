import { createCorsResponse, handleCorsOptions } from "@/lib/cors";
import { supabaseAdmin } from "@/lib/supabase-manager";
import { printLog } from "@/lib/utils";

export async function OPTIONS(request: Request) {
  return handleCorsOptions(request);
}

export async function POST(request: Request) {
  try {
    const { orderId, riderId } = await request.json();

    if (!orderId || !riderId) {
      return createCorsResponse(
        { error: "Order ID and Rider ID are required" },
        400,
        request
      );
    }

    const admin = supabaseAdmin();
    if (!admin) {
      printLog("❌ Supabase admin client not initialized", true);
      return createCorsResponse(
        { error: "Service configuration error" },
        500,
        request
      );
    }

    // Verifica che l'ordine esista e sia assegnato a questo rider
    const { data: orderCheck, error: checkError } = await admin
      .from('orders')
      .select('id, driver_id, status, stripe_payment_intent_id, net_profit, payment_issuer')
      .eq('id', orderId)
      .single();

    if (checkError) {
      printLog(`❌ Error checking order: ${JSON.stringify(checkError)}`, true);
      return createCorsResponse(
        { error: `Order not found or not accessible: ${checkError.message}` },
        404,
        request
      );
    }

    if (!orderCheck) {
      return createCorsResponse(
        { error: "Order not found" },
        404,
        request
      );
    }

    if (orderCheck.driver_id !== riderId) {
      return createCorsResponse(
        { error: "Order is not assigned to this rider" },
        403,
        request
      );
    }

    if (orderCheck.status !== 'delivering') {
      return createCorsResponse(
        { success: false, error: 'Order must be in delivering status to be completed' },
        400,
        request
      );
    }

    printLog(`🔍 Attempting to complete order ${orderId} by rider ${riderId}`);

    // Aggiorna l'ordine come completato
    const { data, error } = await admin
      .from('orders')
      .update({ 
        status: 'delivered'
      })
      .eq('id', orderId)
      .eq('driver_id', riderId)
      .select();

    if (error) {
      printLog(`❌ Error updating order: ${JSON.stringify(error)}`, true);
      return createCorsResponse(
        { error: `Failed to complete order: ${error.message}` },
        500,
        request
      );
    }

    if (!data || data.length === 0) {
      printLog(`❌ Update returned no rows`);
      return createCorsResponse(
        { error: "Order completion failed" },
        500,
        request
      );
    }

    printLog(`✅ Order ${orderId} completed by rider ${riderId}`);

    // Update net profit if order has Stripe payment intent and needs updating
    if (orderCheck.stripe_payment_intent_id && 
        (orderCheck.payment_issuer === 'Unknown' || !orderCheck.net_profit || orderCheck.net_profit === 0)) {
      
      try {
        printLog(`🔄 Updating net profit for completed order ${orderId}`);
        
        const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
        const response = await fetch(`${baseUrl}/api/stripe/update-net-profit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            paymentIntentId: orderCheck.stripe_payment_intent_id,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          printLog(`✅ Successfully updated net profit for completed order ${orderId}: €${result.netProfit.toFixed(2)}`);
        } else {
          printLog(`❌ Failed to update net profit for completed order ${orderId}: ${result.error}`, true);
        }
      } catch (error) {
        printLog(`❌ Error updating net profit for completed order ${orderId}: ${error}`, true);
        // Don't fail the order completion if net profit update fails
      }
    }

    return createCorsResponse({
      success: true,
      data: data[0],
      message: "Order completed successfully"
    }, 200, request);

  } catch (error) {
    printLog(`❌ Error in complete-order API: ${error}`, true);
    return createCorsResponse(
      { error: "Internal server error" },
      500,
      request
    );
  }
}
