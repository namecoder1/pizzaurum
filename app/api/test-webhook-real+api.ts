import { printLog } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    printLog("🧪 Testing webhook with real-like data...");
    
    // Get a real user from the database
    const { supabaseAdmin } = await import("@/lib/supabase-manager");
    const admin = supabaseAdmin();
    
    if (!admin) {
      return Response.json({
        success: false,
        error: "Supabase admin client not initialized"
      }, { status: 500 });
    }
    
    // Get a real user
    const { data: users, error: usersError } = await admin
      .from('users')
      .select('id, name, email')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      return Response.json({
        success: false,
        error: "No users found in database"
      }, { status: 500 });
    }
    
    const realUser = users[0];
    printLog(`✅ Using real user: ${realUser.name} (${realUser.email})`);
    
    // Create a mock webhook event with real user data
    const mockWebhookEvent = {
      id: 'evt_test_webhook_real',
      object: 'event',
      api_version: '2025-06-30.basil',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_test_real_webhook',
          object: 'checkout.session',
          amount_total: 2000, // 20.00 EUR
          currency: 'eur',
          customer: 'cus_test_real',
          customer_email: realUser.email,
          payment_intent: 'pi_test_real_webhook',
          metadata: {
            user_id: realUser.id,
            user_email: realUser.email,
            is_delivery: 'true',
            customer_time: new Date().toISOString(),
            is_custom_time: 'false',
            payment_type: 'online',
            items: JSON.stringify([
              {
                id: 'test-pizza',
                name: 'Test Pizza',
                price: 15.00,
                quantity: 1,
                customizations: []
              }
            ])
          }
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: 'req_test_real',
        idempotency_key: null
      },
      type: 'checkout.session.completed'
    };
    
    printLog(`📦 Mock webhook event created for user: ${realUser.id}`);
    
    // Forward to the actual webhook endpoint
    const webhookUrl = 'http://localhost:8081/api/stripe/webhook';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Don't include stripe-signature to trigger bypass in development
      },
      body: JSON.stringify(mockWebhookEvent)
    });
    
    const responseText = await response.text();
    printLog(`📊 Webhook response: ${response.status} - ${responseText}`);
    
    if (response.ok) {
      // Check if order was created
      const { data: orders, error: ordersError } = await admin
        .from('orders')
        .select('id, user_id, price, status')
        .eq('stripe_payment_intent_id', 'pi_test_real_webhook');
      
      if (ordersError) {
        printLog(`❌ Error checking created orders: ${ordersError.message}`, true);
      } else if (orders && orders.length > 0) {
        printLog(`✅ Order created successfully: ${JSON.stringify(orders[0], null, 2)}`);
        
        // Clean up test order
        const { error: deleteError } = await admin
          .from('orders')
          .delete()
          .eq('id', orders[0].id);
        
        if (deleteError) {
          printLog(`⚠️ Failed to clean up test order: ${deleteError.message}`, true);
        } else {
          printLog(`✅ Test order cleaned up successfully`);
        }
      } else {
        printLog(`❌ No order was created for the test payment intent`);
      }
    }
    
    return Response.json({
      success: response.ok,
      status: response.status,
      response: responseText,
      user: realUser,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    printLog(`❌ Real webhook test failed: ${error}`, true);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
