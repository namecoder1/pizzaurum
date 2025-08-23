import { supabaseAdmin } from "@/lib/supabase-admin";
import { printLog } from "@/lib/utils";
import { stripe } from "@/utils/stripe-server";

export async function POST(req: Request) {
  try {
    const { orderId, userId, isAdmin } = await req.json();

    if (!orderId) {
      printLog("❌ Missing orderId in refund request", true);
      return Response.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    printLog(`🔄 Processing refund for order: ${orderId}`);

    // Ensure we have a Supabase admin client
    const admin = supabaseAdmin();
    if (!admin) {
      printLog("❌ Supabase admin client not initialized", true);
      return Response.json(
        { error: "Supabase admin client not initialized" },
        { status: 500 }
      );
    }

    // Recupera l'ordine dal database con tutti i campi necessari
    const { data: order, error: fetchError } = await admin
      .from("orders")
      .select("id, stripe_payment_intent_id, price, status, is_refunded, user_id, payment_issuer")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      printLog(`❌ Order not found: ${orderId}`, true);
      return Response.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, reputation_score')
      .eq('id', order.user_id as any)
      .single();

    if (userError) {
      printLog(`❌ User not found: ${order.user_id}`, true);
      throw userError;
    }

    // Controlli di autorizzazione
    if (!isAdmin) {
      // Se non è admin, deve essere il proprietario dell'ordine
      if (!userId || order.user_id !== userId) {
        printLog(`❌ Unauthorized refund attempt for order ${orderId} by user ${userId}`, true);
        return Response.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }

      // I clienti possono fare refund solo se lo status è "pending" o "accepted"
      if (order.status !== 'pending' && order.status !== 'accepted') {
        printLog(`❌ Customer cannot refund order ${orderId} with status: ${order.status}`, true);
        return Response.json(
          { error: "Refund not allowed for this order status. Only pending or accepted orders can be refunded by customers." },
          { status: 400 }
        );
      }
    }

    // Verifica che l'ordine non sia già stato rimborsato
    if (order.is_refunded) {
      printLog(`⚠️  Order ${orderId} is already refunded`, true);
      return Response.json(
        { error: "Order is already refunded" },
        { status: 400 }
      );
    }

    // Verifica che l'ordine abbia un payment_intent_id
    if (!order.stripe_payment_intent_id) {
      printLog(`❌ No Stripe payment intent found for order: ${orderId}`, true);
      return Response.json(
        { error: "No payment intent found for this order" },
        { status: 400 }
      );
    }

    printLog(`💳 Creating Stripe refund for payment intent: ${order.stripe_payment_intent_id}`);
    printLog(`💰 Refund amount: €${Number(order.price).toFixed(2)}`);

    // Crea il refund tramite Stripe con l'importo corretto
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id as any,
      amount: Math.round(Number(order.price) * 100),
      metadata: {
        order_id: orderId,
        refund_reason: isAdmin ? "requested_by_admin" : "requested_by_customer"
      }
    } as any);

    printLog(`✅ Stripe refund created successfully: ${refund.id}`);
    printLog(`✅ Refunded amount: €${(refund.amount / 100).toFixed(2)}`);

    // SOLO DOPO che il refund Stripe è riuscito, aggiorna il database
    const { error: updateError } = await admin
      .from("orders")
      .update({
        status: 'cancelled',
        is_refunded: true,
        refunded_at: new Date().toISOString(),
        refunded_by: isAdmin ? 'admin' : 'customer',
        stripe_refund_id: refund.id
      })
      .eq("id", orderId);

    if (updateError) {
      printLog(`❌ Error updating order after successful refund: ${updateError}`, true);
      throw updateError;
    }

    printLog(`✅ Order ${orderId} refunded successfully`);

    const { error: updateUserError } = await admin
      .from('users')
      .update({
        reputation_score: Number((user as any)?.reputation_score ?? 0) - 1
      })
      .eq("id", order.user_id as any)

    if (updateUserError) { 
      printLog(`❌ Error updating user after successful refund: ${updateUserError}`, true);
      throw updateUserError;
    }

    printLog(`✅ User ${order.user_id} reputation score updated successfully`);

    return Response.json({
      success: true,
      refund_id: refund.id,
      amount: refund.amount / 100,
      currency: refund.currency,
      status: refund.status
    });

  } catch (error) {
    printLog(`❌ Error processing refund: ${error}`, true);
    
    // Gestisci errori specifici di Stripe
    if (error instanceof Error) {
      if (error.message.includes("already been refunded")) {
        return Response.json(
          { error: "This payment has already been refunded" },
          { status: 400 }
        );
      }
      
      if (error.message.includes("charge has not been captured")) {
        return Response.json(
          { error: "Payment has not been captured yet" },
          { status: 400 }
        );
      }
    }

    return Response.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}