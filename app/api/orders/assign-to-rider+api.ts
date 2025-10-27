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

    // Prima verifichiamo che l'ordine esista e sia disponibile
    const { data: orderCheck, error: checkError } = await admin
      .from('orders')
      .select('id, driver_id, status')
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

    if (orderCheck.driver_id) {
      return createCorsResponse(
        { error: "Order is already assigned to another rider" },
        409,
        request
      );
    }

    printLog(`🔍 Attempting to assign order ${orderId} to rider ${riderId}`);

    // Aggiorna l'ordine (mantiene lo status originale)
    const { data, error } = await admin
      .from('orders')
      .update({ 
        driver_id: riderId
      })
      .eq('id', orderId)
      .select();

    if (error) {
      printLog(`❌ Error updating order: ${JSON.stringify(error)}`, true);
      return createCorsResponse(
        { error: `Failed to assign order: ${error.message}` },
        500,
        request
      );
    }

    if (!data || data.length === 0) {
      printLog(`❌ Update returned no rows`);
      return createCorsResponse(
        { error: "Order assignment failed" },
        500,
        request
      );
    }

    printLog(`✅ Order ${orderId} assigned to rider ${riderId}`);

    return createCorsResponse({
      success: true,
      data: data[0],
      message: "Order assigned successfully"
    }, 200, request);

  } catch (error) {
    printLog(`❌ Error in assign-to-rider API: ${error}`, true);
    return createCorsResponse(
      { error: "Internal server error" },
      500,
      request
    );
  }
}
