import { printLog } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    printLog("🧪 Testing Stripe webhook with real Stripe CLI...");
    
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
    
    // Create a test payment intent using Stripe CLI
    printLog("💳 Creating test payment intent with Stripe CLI...");
    
    // Use the Stripe CLI to trigger a test event
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      // Trigger a test payment_intent.succeeded event
      const { stdout, stderr } = await execAsync('stripe trigger payment_intent.succeeded');
      printLog(`📊 Stripe CLI output: ${stdout}`);
      if (stderr) {
        printLog(`⚠️ Stripe CLI stderr: ${stderr}`, true);
      }
      
      return Response.json({
        success: true,
        message: "Test Stripe event triggered successfully",
        user: realUser,
        stripeOutput: stdout,
        timestamp: new Date().toISOString()
      });
      
    } catch (stripeError) {
      printLog(`❌ Stripe CLI error: ${stripeError}`, true);
      return Response.json({
        success: false,
        error: "Failed to trigger Stripe event",
        details: stripeError instanceof Error ? stripeError.message : String(stripeError),
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    printLog(`❌ Stripe event test failed: ${error}`, true);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
