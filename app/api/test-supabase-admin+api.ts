import { supabaseAdmin } from "@/lib/supabase-manager";
import { printLog } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    printLog("🧪 Testing Supabase admin client initialization...");
    
    // Test environment variables
    const envCheck = {
      APP_ENV: process.env.APP_ENV,
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
    };
    
    printLog(`🔧 Environment check: ${JSON.stringify(envCheck)}`);
    
    // Test admin client initialization
    const admin = supabaseAdmin();
    printLog(`🔧 Admin client result: ${admin ? 'SUCCESS' : 'NULL'}`);
    
    if (!admin) {
      return Response.json({
        success: false,
        error: "Supabase admin client not initialized",
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Test a simple query
    printLog("🧪 Testing admin client with a simple query...");
    const { data, error } = await admin
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      printLog(`❌ Admin client query failed: ${error.message}`, true);
      return Response.json({
        success: false,
        error: "Admin client query failed",
        details: error.message,
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    printLog("✅ Admin client test successful!");
    
    return Response.json({
      success: true,
      message: "Supabase admin client is working correctly",
      envCheck,
      queryResult: data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    printLog(`❌ Test failed with error: ${error}`, true);
    return Response.json({
      success: false,
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
