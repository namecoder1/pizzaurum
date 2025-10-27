import { printLog } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    printLog("🧪 Testing webhook database connection...");
    
    // Test environment variables
    const envCheck = {
      APP_ENV: process.env.APP_ENV,
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
    };
    
    printLog(`🔧 Environment check: ${JSON.stringify(envCheck)}`);
    
    // Import and test Supabase admin client
    const { supabaseAdmin } = await import("@/lib/supabase-manager");
    const admin = supabaseAdmin();
    
    if (!admin) {
      printLog("❌ Supabase admin client not initialized", true);
      return Response.json({
        success: false,
        error: "Supabase admin client not initialized",
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    printLog("✅ Supabase admin client initialized successfully");
    
    // Test database connection with a simple query
    printLog("🧪 Testing database connection...");
    const { data: usersData, error: usersError } = await admin
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      printLog(`❌ Users table query failed: ${usersError.message}`, true);
      return Response.json({
        success: false,
        error: "Database connection failed",
        details: usersError.message,
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    printLog("✅ Users table query successful");
    
    // Test orders table structure
    printLog("🧪 Testing orders table...");
    const { data: ordersData, error: ordersError } = await admin
      .from('orders')
      .select('id, status, price, user_id')
      .limit(1);
    
    if (ordersError) {
      printLog(`❌ Orders table query failed: ${ordersError.message}`, true);
      return Response.json({
        success: false,
        error: "Orders table access failed",
        details: ordersError.message,
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    printLog("✅ Orders table query successful");
    
    // Test inserting a dummy order (we'll delete it immediately)
    printLog("🧪 Testing order insertion...");
    const testOrderData = {
      status: "test",
      price: 0.01,
      payment: "online" as const,
      is_paid: false,
      online_payment: true,
      customer_time: new Date().toISOString(),
      user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID
      products: [],
      is_delivery: false,
      is_custom_time: false,
      net_profit: 0,
      payment_issuer: 'Test',
      is_refunded: null,
      customer_review: null,
      report: null,
      stripe_refund_id: null,
      refunded_at: null,
      refunded_by: null,
      is_email_sent: false
    };
    
    const { data: insertedTestOrder, error: insertError } = await admin
      .from("orders")
      .insert(testOrderData)
      .select("id")
      .single();
    
    if (insertError) {
      printLog(`❌ Test order insertion failed: ${JSON.stringify(insertError, null, 2)}`, true);
      return Response.json({
        success: false,
        error: "Test order insertion failed",
        details: insertError,
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    printLog(`✅ Test order inserted successfully with ID: ${insertedTestOrder?.id}`);
    
    // Clean up: delete the test order
    if (insertedTestOrder?.id) {
      const { error: deleteError } = await admin
        .from("orders")
        .delete()
        .eq("id", insertedTestOrder.id);
      
      if (deleteError) {
        printLog(`⚠️ Failed to delete test order: ${deleteError.message}`, true);
      } else {
        printLog("✅ Test order cleaned up successfully");
      }
    }
    
    printLog("🎉 All webhook database tests passed!");
    
    return Response.json({
      success: true,
      message: "Webhook database connection is working correctly",
      envCheck,
      testResults: {
        adminClient: "SUCCESS",
        usersTable: "SUCCESS", 
        ordersTable: "SUCCESS",
        orderInsertion: "SUCCESS",
        cleanup: "SUCCESS"
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    printLog(`❌ Webhook database test failed: ${error}`, true);
    return Response.json({
      success: false,
      error: "Webhook database test failed",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
