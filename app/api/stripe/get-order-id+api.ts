import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/utils/stripe-server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return Response.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session.payment_intent) {
      return Response.json(
        { error: 'No payment intent found for this session' },
        { status: 404 }
      );
    }

    // Ensure we have a Supabase admin client
    const admin = supabaseAdmin();
    if (!admin) {
      return Response.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }

    // Find the order in our database using the payment intent ID
    const { data: order, error } = await admin
      .from("orders")
      .select("id, status, price, created_at")
      .eq("stripe_payment_intent_id", session.payment_intent)
      .single();

    if (error) {
      console.error("API: Error finding order:", error);
      return Response.json(
        { error: 'Order not found', details: error },
        { status: 404 }
      );
    }

    if (!order) {
      return Response.json(
        { error: 'Order not found in database' },
        { status: 404 }
      );
    }

    return Response.json({
      order_id: order.id,
      status: order.status,
      price: order.price,
      created_at: order.created_at
    });

  } catch (error) {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 