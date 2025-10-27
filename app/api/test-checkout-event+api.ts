import { printLog } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    printLog("🧪 Testing Stripe checkout session webhook...");
    
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
    
    // Create a test checkout session using Stripe CLI with custom metadata
    printLog("💳 Creating test checkout session with Stripe CLI...");
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      // Create a checkout session with metadata
      const checkoutCommand = `stripe checkout sessions create \
        --success-url "https://example.com/success" \
        --cancel-url "https://example.com/cancel" \
        --line-items '[{"price_data":{"currency":"eur","product_data":{"name":"Test Pizza"},"unit_amount":2000},"quantity":1}]' \
        --metadata user_id="${realUser.id}" \
        --metadata user_email="${realUser.email}" \
        --metadata is_delivery="true" \
        --metadata customer_time="${new Date().toISOString()}" \
        --metadata is_custom_time="false" \
        --metadata payment_type="online" \
        --metadata items='[{"id":"test-pizza","name":"Test Pizza","price":20.00,"quantity":1,"customizations":[]}]'`;
      
      printLog(`🔧 Executing: ${checkoutCommand}`);
      
      const { stdout, stderr } = await execAsync(checkoutCommand);
      printLog(`📊 Stripe CLI output: ${stdout}`);
      if (stderr) {
        printLog(`⚠️ Stripe CLI stderr: ${stderr}`, true);
      }
      
      // Extract the session ID from the output
      const sessionMatch = stdout.match(/cs_test_[a-zA-Z0-9]+/);
      const sessionId = sessionMatch ? sessionMatch[0] : null;
      
      if (sessionId) {
        printLog(`✅ Checkout session created: ${sessionId}`);
        
        // Now complete the session to trigger the webhook
        printLog("🔄 Completing checkout session...");
        const completeCommand = `stripe checkout sessions expire ${sessionId}`;
        await execAsync(completeCommand);
        
        // Actually, let's trigger a checkout.session.completed event directly
        printLog("🎯 Triggering checkout.session.completed event...");
        const triggerCommand = `stripe trigger checkout.session.completed`;
        const { stdout: triggerOutput, stderr: triggerError } = await execAsync(triggerCommand);
        
        printLog(`📊 Trigger output: ${triggerOutput}`);
        if (triggerError) {
          printLog(`⚠️ Trigger stderr: ${triggerError}`, true);
        }
      }
      
      return Response.json({
        success: true,
        message: "Test checkout session event triggered successfully",
        user: realUser,
        sessionId,
        stripeOutput: stdout,
        triggerOutput,
        timestamp: new Date().toISOString()
      });
      
    } catch (stripeError) {
      printLog(`❌ Stripe CLI error: ${stripeError}`, true);
      return Response.json({
        success: false,
        error: "Failed to trigger Stripe checkout event",
        details: stripeError instanceof Error ? stripeError.message : String(stripeError),
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    printLog(`❌ Stripe checkout test failed: ${error}`, true);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
