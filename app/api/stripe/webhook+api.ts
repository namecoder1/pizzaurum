import { supabaseAdmin } from "@/lib/supabase-manager";
import { cleanProductName, cleanProductNameAggressive, printLog } from "@/lib/utils";
import { client } from "@/sanity/client";
import { PRODUCT_BY_ID_QUERY } from "@/sanity/queries";
import { StripeCheckoutSession, StripePaymentIntent, WebhookEvent } from "@/types/types";
import { config } from "@/utils/config";
import { getWebhookSecret, shouldBypassSignatureVerification } from "@/utils/server-config";
import { stripe } from "@/utils/stripe-server";

// Debug import - removed for production

// Helper function to get admin client with fallback
async function getAdminClient(): Promise<any> {
  let admin = supabaseAdmin();
  
  if (!admin) {
    printLog("❌ Supabase admin client not initialized, attempting fallback...", true);
    
    // Try to create admin client manually as fallback
    printLog("🔄 Attempting manual admin client creation...");
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
      if (!serviceRoleKey || !supabaseUrl) {
        printLog("❌ Missing required environment variables for manual admin client creation", true);
        throw new Error('Missing required environment variables');
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      });
      
      printLog("✅ Manual admin client creation successful");
    } catch (fallbackError) {
      printLog(`❌ Manual admin client creation failed: ${fallbackError}`, true);
      throw new Error('Supabase admin client not initialized and fallback failed');
    }
  }
  
  return admin;
}

// Webhook event types
const WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: "checkout.session.completed",
  PAYMENT_INTENT_SUCCEEDED: "payment_intent.succeeded",
  PAYMENT_INTENT_PAYMENT_FAILED: "payment_intent.payment_failed",
  CHARGE_UPDATED: "charge.updated",
  INVOICE_PAYMENT_SUCCEEDED: "invoice.payment_succeeded",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
  CUSTOMER_SUBSCRIPTION_CREATED: "customer.subscription.created",
  CUSTOMER_SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  CUSTOMER_SUBSCRIPTION_DELETED: "customer.subscription.deleted",
} as const;

let apiUrl: string
// Use APP_ENV if available, otherwise fallback to NODE_ENV
const currentEnv = process.env.APP_ENV || process.env.NODE_ENV

if (currentEnv === 'production' || currentEnv === 'preview') {
  apiUrl = process.env.EXPO_PUBLIC_BASE_URL || 'https://pizzaurum.it'
} else {
  apiUrl = 'http://localhost:8081'
}

// Helper function to convert custom time format to ISO timestamp
function convertCustomTimeToISO(customTime: string): string {
  if (!customTime || customTime === "asap") {
    return new Date().toISOString();
  }
  
  // If it's already a valid ISO string, return as is
  if (customTime.includes('T') || customTime.includes('Z')) {
    try {
      const date = new Date(customTime);
      if (isNaN(date.getTime())) {
        return new Date().toISOString();
      }
      return customTime;
    } catch (error) {
      return new Date().toISOString();
    }
  }
  
  // Handle "oggi-HH:MM" or "domani-HH:MM" format
  if (customTime.includes('-')) {
    try {
      const [day, time] = customTime.split('-');
      const [hours, minutes] = time.split(':').map(Number);
      
      const now = new Date();
      const targetDate = new Date();
      
      if (day === 'domani') {
        targetDate.setDate(now.getDate() + 1);
      }
      
      targetDate.setHours(hours, minutes, 0, 0);
      return targetDate.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }
  
  return new Date().toISOString();
}

// Helper function to fetch product details from Sanity
async function fetchProductFromSanity(productId: string) {
  try {
    const products = await client.fetch(PRODUCT_BY_ID_QUERY, { id: productId });
    const product = products[0];
    
    if (product) {
      // Clean the product name
      const originalName = product.name;
      product.name = cleanProductName(product.name);
      
      if (product.name.length > originalName.length * 0.8) {
        product.name = cleanProductNameAggressive(originalName);
      }
    }
    
    return product;
  } catch (error) {
    printLog(`Error fetching product ${productId} from Sanity: ${error}`, true);
    return null;
  }
}



export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  printLog(`🔔 Webhook received: ${JSON.stringify({
    hasSignature: !!signature,
    isDevelopment: config.isDevelopment,
    bodyLength: body.length,
    webhookSecret: getWebhookSecret() ? "SET" : "NOT_SET",
    bypassSignature: shouldBypassSignatureVerification(),
    env: {
      APP_ENV: process.env.APP_ENV,
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? "SET" : "MISSING"
    }
  })}`);

  let event: WebhookEvent;

  if (shouldBypassSignatureVerification()) {
    printLog("⚠️  Bypassing signature verification in development");
    try {
      event = JSON.parse(body);
    } catch (parseErr) {
      printLog(`❌ Failed to parse webhook body: ${parseErr}`, true);
      return Response.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }
  } else {
    if (!signature) {
      printLog("❌ No signature provided", true);
      return Response.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      printLog("❌ No webhook secret configured", true);
      return Response.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (parseErr) {
      printLog(`❌ Failed to parse webhook body: ${parseErr}`, true);
      return Response.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }
  }

  try {
    printLog(`📨 Processing webhook event: ${event.type}`);

    switch (event.type) {
      case WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED:
        await handleCheckoutSessionCompleted(event.data.object as StripeCheckoutSession);
        break;
      
      case WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED:
        await handlePaymentIntentSucceeded(event.data.object as StripePaymentIntent);
        break;
      
      case WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED:
        await handlePaymentIntentFailed(event.data.object as StripePaymentIntent);
        break;

      case WEBHOOK_EVENTS.CHARGE_UPDATED:
        await handleChargeUpdated(event.data.object);
        break;

      case "charge.failed":
        await handleChargeFailed(event.data.object);
        break;

      case WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED:
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        printLog(`⚠️  Unhandled event type: ${event.type}`, true);
    }

    printLog("✅ Webhook processed successfully");
    return Response.json({ received: true });
  } catch (error) {
    printLog(`❌ Error processing webhook: ${error}`, true);
    return Response.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: StripeCheckoutSession) {
  printLog(`🚀 Starting handleCheckoutSessionCompleted for session: ${session.id}`);

  try {
    printLog(`🔧 Attempting to initialize Supabase admin client...`);
    const admin = await getAdminClient();
    printLog(`🔧 Supabase admin client result: ${admin ? 'SUCCESS' : 'NULL'}`);

    printLog(`✅ Supabase admin client initialized`);

    // Check if order already exists
    printLog(`🔍 Checking if order already exists for payment intent: ${session.payment_intent}`);
    const { data: existingOrder, error: existingError } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", session.payment_intent as any)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      printLog(`❌ Error checking existing order: ${existingError}`, true);
      throw existingError;
    }

    if (existingOrder) {
      printLog(`✅ Order already exists for session: ${session.id}`);
      return;
    }

    printLog(`✅ No existing order found, proceeding with creation`);

    // Validate user_id is present
    if (!session.metadata?.user_id) {
      printLog("❌ Missing user_id in session metadata. Cannot create order.", true);
      throw new Error("Missing user_id in session metadata");
    }

    printLog(`✅ User ID found: ${session.metadata.user_id}`);

    // Use estimated fees initially for fast order creation
    const totalAmount = session.amount_total / 100;
    const estimatedFee = (totalAmount * 0.029) + 0.30;
    const estimatedNetProfit = Math.round(Math.max(0, totalAmount - estimatedFee) * 100);

    printLog(`💰 Calculated estimated fees: total=${totalAmount}, fee=${estimatedFee}, net_profit=${estimatedNetProfit}`);

    // Create basic products array without Sanity fetch for now
    let products = [];
    
    if (session.metadata?.products_compact) {
      printLog(`📦 Processing products_compact: ${session.metadata.products_compact}`);
      const productEntries = session.metadata.products_compact.split(",");
      
      // Parse extras metadata if available
      const extrasMap = new Map<number, { name: string; price: number }[]>();
      if (session.metadata?.products_extras) {
        printLog(`🔧 Processing products_extras: ${session.metadata.products_extras}`);
        const extrasEntries = session.metadata.products_extras.split(";");
        extrasEntries.forEach((entry: string) => {
          const [indexStr, extrasStr] = entry.split(":");
          const index = parseInt(indexStr);
          const extras = extrasStr.split(",").map((extra: string) => {
            const [name, price] = extra.split("|");
            return { name, price: parseFloat(price) };
          });
          extrasMap.set(index, extras);
        });
      }
      
      // Create basic products without Sanity fetch for now
      products = productEntries.map((entry: string, index: number) => {
        const [productId, quantity, extrasCount] = entry.split(":");
        const extras = extrasMap.get(index) || [];
        
        return {
          name: `Prodotto ${productId}`,
          price: 0, // Will be updated later
          quantity: parseInt(quantity),
          product_id: productId,
          extras: extras
        };
      });
      
      printLog(`✅ Created ${products.length} basic products`);
    } else {
      products = [{
        name: `Ordine Pizzaurum`,
        price: session.amount_total / 100,
        quantity: 1,
        product_id: null,
        extras: []
      }];
      printLog(`✅ Created fallback product`);
    }

    const totalPrice = session.amount_total / 100;

    // Create new order with estimated fees initially
    const orderData = {
      status: "pending", 
      price: totalPrice,
      payment: "online" as const, 
      is_paid: true,
      online_payment: true,
      stripe_invoice_id: session.invoice || null,
      stripe_payment_intent_id: session.payment_intent || null,
      customer_time: convertCustomTimeToISO(session.metadata?.customer_time || 'asap'),
      user_id: session.metadata.user_id,
      products: products,
      is_delivery: session.metadata?.is_delivery === "true" || false,
      is_custom_time: session.metadata?.is_custom_time === "true" || false,
      net_profit: estimatedNetProfit,
      payment_issuer: 'Unknown',
      is_refunded: null,
      customer_review: null,
      report: null,
      stripe_refund_id: null,
      refunded_at: null,
      refunded_by: null,
      is_email_sent: false
    };

    printLog(`📝 Creating order with data: ${JSON.stringify(orderData)}`);

    const { data: insertedOrder, error: insertError } = await admin
      .from("orders")
      .insert(orderData)
      .select("id")
      .single();

    if (insertError) {
      printLog(`❌ Error inserting order: ${JSON.stringify(insertError, null, 2)}`, true);
      throw insertError;
    }

    printLog(`✅ Order created successfully for session: ${session.id} with order ID: ${insertedOrder?.id}`);

    // Update user reputation score
    try {
      printLog(`👤 Updating user reputation score for user: ${session.metadata.user_id}`);
      const { data: infoUser, error: infoUserError } = await admin
        .from('users')
        .select('id, reputation_score')
        .eq('id', session.metadata.user_id as any)
        .single();

      if (!infoUserError) {
        await admin
          .from('users')
          .update({
            reputation_score: Number((infoUser as any)?.reputation_score ?? 0) + 1
          }) 
          .eq('id', session.metadata.user_id as any);
        
        printLog(`✅ User ${session.metadata.user_id} reputation score updated successfully`);
      } else {
        printLog(`⚠️ Could not update user reputation score: ${infoUserError}`, true);
      }
    } catch (userError) {
      printLog(`❌ Error updating user reputation score: ${userError}`, true);
    }

    // Email will be sent from the customer pages
    if (insertedOrder?.id) {
      printLog(`✅ Order created successfully, email will be sent from customer page`);
    }

    printLog(`🎉 handleCheckoutSessionCompleted completed successfully for session: ${session.id}`);

  } catch (error) {
    printLog(`❌ Error in handleCheckoutSessionCompleted: ${JSON.stringify(error, null, 2)}`, true);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: StripePaymentIntent) {
  printLog(`Processing payment_intent.succeeded: ${paymentIntent.id}`);

  try {
    printLog(`🔧 Attempting to initialize Supabase admin client for payment intent...`);
    const admin = await getAdminClient();
    printLog(`🔧 Supabase admin client result: ${admin ? 'SUCCESS' : 'NULL'}`);
    
    // Check if order already exists
    const { data: existingOrder } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .single();

    if (existingOrder) {
      printLog(`Order already exists for payment intent: ${paymentIntent.id}`);
      return;
    }

    // If no order exists and no metadata, we can't create an order
    if (!paymentIntent.metadata?.user_id) {
      printLog(`No order exists for payment intent ${paymentIntent.id} and no metadata available. Skipping order creation.`);
      return;
    }

    // Create basic products array
    let products = [];
    try {
      if (paymentIntent.metadata?.cart_items) {
        const cartItems = JSON.parse(paymentIntent.metadata.cart_items);
        products = cartItems.map((item: any) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          product_id: item.id,
          extras: item.customizations || []
        }));
      } else if (paymentIntent.metadata?.products_compact) {
        const productEntries = paymentIntent.metadata.products_compact.split(",");
        
        products = productEntries.map((entry: string, index: number) => {
          const [productId, quantity, extrasCount] = entry.split(":");
          
          return {
            name: `Prodotto ${productId}`,
            price: 0,
            quantity: parseInt(quantity),
            product_id: productId,
            extras: []
          };
        });
      } else {
        products = [{
          name: `Ordine Pizzaurum`,
          price: paymentIntent.amount / 100,
          quantity: 1,
          product_id: null,
          extras: []
        }];
      }
    } catch (error) {
      printLog(`Error parsing cart items from metadata: ${error}`, true);
      products = [{
        name: `Ordine Pizzaurum`,
        price: paymentIntent.amount / 100,
        quantity: 1,
        product_id: null,
        extras: []
      }];
    }

    // Use estimated fees initially
    const totalAmount = paymentIntent.amount / 100;
    const estimatedFee = (totalAmount * 0.029) + 0.30;
    const estimatedNetProfit = Math.max(0, totalAmount - estimatedFee);

    const totalPrice = paymentIntent.amount / 100;

    const orderData = {
      status: "pending",
      stripe_payment_intent_id: paymentIntent.id,
      payment: "online" as const,
      is_paid: true,
      online_payment: true,
      price: totalPrice,
      customer_time: convertCustomTimeToISO(paymentIntent.metadata?.customer_time || 'asap'),
      user_id: paymentIntent.metadata.user_id,
      products: products,
      is_delivery: paymentIntent.metadata?.is_delivery === "true" || false,
      is_custom_time: paymentIntent.metadata?.is_custom_time === "true" || false,
      net_profit: Math.round(estimatedNetProfit * 100),
      payment_issuer: 'Unknown',
      is_refunded: null,
      customer_review: null,
      report: null,
      stripe_refund_id: null,
      refunded_at: null,
      refunded_by: null,
      is_email_sent: false
    };

    const { data: insertedOrder, error: insertError } = await admin
      .from("orders")
      .insert(orderData)
      .select("id")
      .single();

    if (insertError) {
      printLog(`Error inserting order: ${JSON.stringify(insertError, null, 2)}`, true);
      throw insertError;
    }

    printLog(`Order processed successfully for payment intent: ${paymentIntent.id}`);

    // Email will be sent from the customer pages
    if (insertedOrder?.id) {
      printLog(`✅ Order created successfully, email will be sent from customer page`);
    }
  } catch (error) {
    printLog(`Error in handlePaymentIntentSucceeded: ${JSON.stringify(error, null, 2)}`, true);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: StripePaymentIntent) {
  printLog(`Processing payment_intent.payment_failed: ${paymentIntent.id}`);

  try {
    const admin = await getAdminClient();

    // Create basic products array
    let products = [];
    try {
      if (paymentIntent.metadata?.cart_items) {
        const cartItems = JSON.parse(paymentIntent.metadata.cart_items);
        products = cartItems.map((item: any) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          product_id: item.id,
          extras: item.customizations || []
        }));
      } else if (paymentIntent.metadata?.products_compact) {
        const productEntries = paymentIntent.metadata.products_compact.split(",");
        
        products = productEntries.map((entry: string, index: number) => {
          const [productId, quantity, extrasCount] = entry.split(":");
          
          return {
            name: `Prodotto ${productId}`,
            price: 0,
            quantity: parseInt(quantity),
            product_id: productId,
            extras: []
          };
        });
      } else {
        const itemsCount = parseInt(paymentIntent.metadata?.items_count || "1");
        products = [{
          name: `Ordine Pizzaurum (${itemsCount} prodotti) - Pagamento Fallito`,
          price: paymentIntent.amount / 100,
          quantity: 1,
          product_id: null,
          extras: []
        }];
      }
    } catch (error) {
      printLog(`Error parsing cart items from metadata: ${error}`, true);
      const itemsCount = parseInt(paymentIntent.metadata?.items_count || "1");
      products = [{
        name: `Ordine Pizzaurum (${itemsCount} prodotti) - Pagamento Fallito`,
        price: paymentIntent.amount / 100,
        quantity: 1,
        product_id: null,
        extras: []
      }];
    }

    const totalPrice = paymentIntent.amount / 100;

    const orderData = {
      status: "failed",
      stripe_payment_intent_id: paymentIntent.id,
      payment: "online" as const,
      is_paid: false,
      online_payment: true,
      price: totalPrice,
      customer_time: convertCustomTimeToISO(paymentIntent.metadata?.customer_time || 'asap'),
      user_id: paymentIntent.metadata?.user_id || "706296cf-f659-4aa6-b079-c5f5525880c2",
      products: products,
      is_delivery: paymentIntent.metadata?.is_delivery === "true" || false,
      is_custom_time: paymentIntent.metadata?.is_custom_time === "true" || false,
      net_profit: 0,
      payment_issuer: 'Unknown',
      is_refunded: null,
      customer_review: null,
      report: null,
      stripe_refund_id: null,
      refunded_at: null,
      refunded_by: null
    };

    const { error: insertError } = await admin
      .from("orders")
      .insert(orderData);

    if (insertError) {
      printLog(`Error inserting failed order: ${JSON.stringify(insertError, null, 2)}`, true);
      throw insertError;
    }

    printLog(`Order marked as failed for payment intent: ${paymentIntent.id}`);
  } catch (error) {
    printLog(`Error in handlePaymentIntentFailed: ${JSON.stringify(error, null, 2)}`, true);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  printLog(`Processing invoice.payment_succeeded: ${invoice.id}`);
  
  try {
    const admin = await getAdminClient();
    
    if (invoice.subscription) {
      printLog(`Subscription payment succeeded: ${invoice.subscription}`);
    }
    
    if (invoice.metadata?.order_id) {
      const { error: updateError } = await admin
        .from("orders")
        .update({
          status: "pending",
          is_paid: true,
          customer_time: new Date().toISOString(),
        })
        .eq("id", invoice.metadata.order_id);

      if (updateError) {
        printLog(`Error updating order for invoice: ${updateError}`, true);
        throw updateError;
      }
    }
  } catch (error) {
    printLog(`Error in handleInvoicePaymentSucceeded: ${error}`, true);
    throw error;
  }
}

async function handleChargeFailed(charge: any) {
  printLog(`Processing charge.failed: ${charge.id}`);
  
  try {
    const admin = await getAdminClient();
    
    if (charge.payment_intent) {
      const { data: order } = await admin
        .from("orders")
        .select("id, status")
        .eq("stripe_payment_intent_id", charge.payment_intent)
        .single();
      
      if (order) {
        printLog(`Found order ${order.id} for failed charge ${charge.id}`);
        
        if (order.status !== "failed") {
          const { error: updateError } = await admin
            .from("orders")
            .update({ 
              status: "failed",
              is_paid: false
            })
            .eq("id", order.id as any);
          
          if (updateError) {
            printLog(`Error updating order status to failed: ${JSON.stringify(updateError, null, 2)}`, true);
          } else {
            printLog(`✅ Updated order ${order.id} status to failed`);
          }
        } else {
          printLog(`Order ${order.id} is already marked as failed`);
        }
      } else {
        printLog(`No order found for failed charge payment intent: ${charge.payment_intent}`);
      }
    }
  } catch (error) {
    printLog(`Error in handleChargeFailed: ${JSON.stringify(error, null, 2)}`, true);
  }
}

async function handleChargeUpdated(charge: any) {
  printLog(`Processing charge.updated: ${charge.id}`);
  
  try {
    const admin = await getAdminClient();
    
    if (charge.payment_intent) {
      const { data: order } = await admin
        .from("orders")
        .select("id, status")
        .eq("stripe_payment_intent_id", charge.payment_intent)
        .single();
      
      if (order) {
        printLog(`Found order ${order.id} for charge ${charge.id}`);
        
        let newStatus = order.status;
        let isPaid = order.status === "pending";
        
        if (charge.status === "succeeded") {
          newStatus = "pending";
          isPaid = true;
        } else if (charge.status === "failed") {
          newStatus = "failed";
          isPaid = false;
        }
        
        if (newStatus !== order.status) {
          const { error: updateError } = await admin
            .from("orders")
            .update({ 
              status: newStatus,
              is_paid: isPaid
            })
            .eq("id", order.id as any);
          
          if (updateError) {
            printLog(`Error updating order status: ${JSON.stringify(updateError, null, 2)}`, true);
          } else {
            printLog(`✅ Updated order ${order.id} status to ${newStatus}`);
          }
        } else {
          printLog(`Order ${order.id} status unchanged: ${order.status}`);
        }
      } else {
        printLog(`No order found for charge payment intent: ${charge.payment_intent}`);
      }
    }
  } catch (error) {
    printLog(`Error in handleChargeUpdated: ${JSON.stringify(error, null, 2)}`, true);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  printLog(`Processing invoice.payment_failed: ${invoice.id}`);
  
  try {
    const admin = await getAdminClient();
    
    if (invoice.subscription) {
      printLog(`Subscription payment failed: ${invoice.subscription}`, true);
    }
    
    if (invoice.metadata?.order_id) {
      const { error: updateError } = await admin
        .from("orders")
        .update({
          status: "failed",
          is_paid: false
        })
        .eq("id", invoice.metadata.order_id);

      if (updateError) {
        printLog(`Error updating order for failed invoice: ${updateError}`, true);
        throw updateError;
      }
    }
  } catch (error) {
    printLog(`Error in handleInvoicePaymentFailed: ${error}`, true);
    throw error;
  }
}

