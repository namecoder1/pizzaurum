import { cleanProductName, formatAmountForStripe } from "@/lib/utils";
import { CURRENCY } from "@/utils/config";
import { stripe } from "@/utils/stripe-server";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
      items, 
      totalPrice, 
      user_id, 
      user_email,
      is_delivery, 
      customer_time,
      is_custom_time,
      stripe_customer_id
    } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: 'Invalid items data' },
        { status: 400 }
      );
    }

    if (!totalPrice || typeof totalPrice !== 'number' || totalPrice <= 0) {
      return Response.json(
        { error: 'Invalid total price' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return Response.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }

    // Format products for order (following ORDERS.md structure)
    const products = items.map((item: any) => ({
      product_id: item.id,
      name: cleanProductName(item.name),
      price: item.price,
      quantity: item.quantity,
      extras: item.customizations || []
    }));

    // Check if Stripe is properly configured
    if (!stripe) {
      return Response.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Create compact metadata format to avoid 500 character limit
    const products_compact = products
      .map((p) => `${p.product_id}:${p.quantity}:${(p.extras || []).length}`)
      .join(",");

    const total_extras = products
      .reduce((sum, p) => sum + (p.extras?.length || 0), 0)
      .toString();

    // Create extras metadata for each product
    const products_extras = products
      .map((p, index) => {
        const extras = p.extras || [];
        if (extras.length === 0) return null;
        return `${index}:${extras.map((e: any) => `${e.name}|${e.price}`).join(',')}`;
      })
      .filter(Boolean)
      .join(';');

    // Get base URL for success and cancel URLs
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    // Construct base URL
    let baseUrl: string;
    if (origin) {
      baseUrl = origin;
    } else if (host) {
      baseUrl = `${protocol}://${host}`;
    } else {
      // Fallback for development
      // Use APP_ENV if available, otherwise fallback to NODE_ENV
      const currentEnv = process.env.APP_ENV || process.env.NODE_ENV
      baseUrl = (currentEnv === 'production' || currentEnv === 'preview')
        ? 'https://pizzaurum.com' 
        : 'http://localhost:3000';
    }
    
    // Create Stripe checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      submit_type: 'pay',
      payment_method_types: [
        'card',
        'satispay',
        'revolut_pay',
        'amazon_pay',
      ],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: 'Ordine Pizzaurum',
              description: `${items.length} prodotti`,
            },
            unit_amount: formatAmountForStripe(totalPrice, CURRENCY),
          }
        }
      ],
      success_url: isMobile 
        ? `${baseUrl}/orders?session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isMobile 
        ? `${baseUrl}/`
        : `${baseUrl}/checkout`,
      metadata: {
        user_id: user_id,
        is_delivery: is_delivery.toString(),
        customer_time: customer_time || new Date().toISOString(),
        is_custom_time: (is_custom_time || false).toString(),
        payment_type: "online",
        // Compact format: "id:qty:extras_count,id:qty:extras_count"
        products_compact: products_compact,
        total_extras: total_extras,
        // Extras format: "0:name|price,name|price;1:name|price"
        products_extras: products_extras
      },
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic'
        }
      }
    };

    // Use existing customer if available, otherwise use customer_email for pre-filling
    if (stripe_customer_id) {
      sessionConfig.customer = stripe_customer_id;
    } else if (user_email) {
      sessionConfig.customer_email = user_email;
    }

    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return Response.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return Response.json(
      { 
        error: 'Failed to create checkout session', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 