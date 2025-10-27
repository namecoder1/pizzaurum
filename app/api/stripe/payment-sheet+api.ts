import { cleanProductName, printLog } from "@/lib/utils";
import { CURRENCY } from "@/utils/config";
import { stripe } from "@/utils/stripe-server";

export async function POST(req: Request) {
	console.log('🟡 Payment Sheet API called');
	printLog(`🟡 Payment Sheet API called`, true);
	
	try {
		printLog(`🟡 Parsing request body...`, true);
		const { amount, metadata, cartItems, user_id, user_email, stripe_customer_id } = await req.json()
		printLog(`🟡 Request body parsed successfully`, true);
		
		// Debug: Log input parameters
		printLog(`🔍 Input parameters:`, true);
		printLog(`- amount: ${amount}`, true);
		printLog(`- user_id: ${user_id}`, true);
		printLog(`- user_email: ${user_email}`, true);
		printLog(`- stripe_customer_id: ${stripe_customer_id}`, true);
		printLog(`- cartItems length: ${cartItems?.length || 0}`, true);
		
		// Validate required fields
		if (!amount || typeof amount !== 'number' || amount <= 0) {
			printLog(`❌ Invalid amount: ${amount}`, true);
			return Response.json(
				{ error: 'Invalid amount' },
				{ status: 400 }
			);
		}
		
		if (!user_id) {
			printLog(`❌ Missing user_id`, true);
			return Response.json(
				{ error: 'Missing user ID' },
				{ status: 400 }
			);
		}
		
		if (!cartItems || !Array.isArray(cartItems)) {
			printLog(`❌ Invalid cartItems`, true);
			return Response.json(
				{ error: 'Invalid cart items' },
				{ status: 400 }
			);
		}
		
		// Debug: Log environment variables and Stripe configuration
		printLog(`🔍 Environment debug:`, true);
		printLog(`- NODE_ENV: ${process.env.NODE_ENV}`, true);
		printLog(`- APP_ENV: ${process.env.APP_ENV}`, true);
		printLog(`- EXPO_PUBLIC_STRIPE_PUBLIC_KEY: ${process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY ? 'SET' : 'MISSING'}`, true);
		printLog(`- STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING'}`, true);
		printLog(`- STRIPE_SECRET_KEY_TEST: ${process.env.STRIPE_SECRET_KEY_TEST ? 'SET' : 'MISSING'}`, true);
		
		// Test Stripe initialization (simplified)
		printLog(`🟡 Testing Stripe initialization...`, true);
		printLog(`🟡 Stripe object created: ${typeof stripe}`, true);
		
		// Get the appropriate public key based on environment
		const currentEnv = process.env.APP_ENV || process.env.NODE_ENV;
		let pubKey;
		
		if (currentEnv === 'production' || currentEnv === 'preview') {
			pubKey = process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY;
		} else {
			// Development uses test key
			pubKey = process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY_TEST || process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY;
		}
		
		printLog(`🟡 Using publishable key for environment: ${currentEnv}`, true);


		// Use existing customer or create new one
		let customer;
		if (stripe_customer_id) {
			try {
				printLog(`🟡 Retrieving existing customer: ${stripe_customer_id}`);
				// Verify the customer exists and retrieve it
				customer = await stripe.customers.retrieve(stripe_customer_id);
				printLog(`🟡 Customer retrieved successfully: ${customer.id}`);
			} catch (error) {
				printLog(`❌ Error retrieving customer: ${error}`, true);
				customer = null;
			}
		}
	
		// If no existing customer found, create new one
		if (!customer) {
			printLog(`🟡 Creating new customer for user: ${user_id}`);
			const customerData: any = {};
			if (user_email) {
				customerData.email = user_email;
			}
			if (user_id) {
				customerData.metadata = { user_id };
			}
			
			customer = await stripe.customers.create(customerData);
			printLog(`🟡 New customer created: ${customer.id}`);
		}
		printLog(`🟡 Creating ephemeral key for customer: ${customer.id}`);
		const ephemeralKey = await stripe.ephemeralKeys.create(
			{ customer: customer.id },
			{ apiVersion: "2025-06-30.basil"}
		);
		printLog(`🟡 Ephemeral key created successfully`);

	// Format products for order (same as web checkout session)
	const products = cartItems.map((item: any) => ({
		product_id: item.id,
		name: cleanProductName(item.name),
		price: item.price,
		quantity: item.quantity,
		extras: item.customizations || []
	}));

	// Create compact metadata format to avoid 500 character limit (same as web)
	const products_compact = products
		.map((p: any) => `${p.product_id}:${p.quantity}:${(p.extras || []).length}`)
		.join(",");

	const total_extras = products
		.reduce((sum: number, p: any) => sum + (p.extras?.length || 0), 0)
		.toString();

	// Create extras metadata for each product (same as web)
	const products_extras = products
		.map((p: any, index: number) => {
			const extras = p.extras || [];
			if (extras.length === 0) return null;
			return `${index}:${extras.map((e: any) => `${e.name}|${e.price}`).join(',')}`;
		})
		.filter(Boolean)
		.join(';');

	// Prepare metadata with the same format as web checkout session
	// Exclude 'items' field to avoid 500 character limit
	const { items, ...metadataWithoutItems } = metadata;
	const enhancedMetadata = {
		...metadataWithoutItems,
		// Compact format: "id:qty:extras_count,id:qty:extras_count"
		products_compact: products_compact,
		total_extras: total_extras,
		// Extras format: "0:name|price,name|price;1:name|price"
		products_extras: products_extras
	};

		printLog(`🟡 Creating payment intent with amount: ${amount}, currency: ${CURRENCY}`);
		const paymentIntent = await stripe.paymentIntents.create({
			amount: amount,
			currency: CURRENCY,
			customer: customer.id,
			metadata: enhancedMetadata,
			payment_method_types: [
				'card',
				'satispay',
				'revolut_pay',
				'amazon_pay'
			]
		});
		printLog(`🟡 Payment intent created: ${paymentIntent.id}`);

	// Update user with stripe_customer_id if we created a new customer and have user_id
  if (!stripe_customer_id && user_id && customer.id) {
		try {
      const { supabaseAdmin } = await import("@/lib/supabase-admin");
      const admin = supabaseAdmin();
      if (!admin) {
        throw new Error('Supabase admin client not initialized');
      }
      const { error: userUpdateError } = await admin
				.from("users")
				.update({ stripe_customer_id: customer.id })
				.eq("id", user_id);

			if (userUpdateError) {
				printLog(`❌ Error updating user with stripe_customer_id: ${userUpdateError}`, true);
			} else {
				printLog(`🟡 Updated user ${user_id} with stripe_customer_id: ${customer.id}`);
			}
		} catch (userError) {
			printLog(`❌ Error updating user: ${userError}`, true);
		}
	}

	const response = {
		paymentIntent: paymentIntent.client_secret,
		ephemeralKey: ephemeralKey.secret,
		customer: customer.id,
		publishableKey: pubKey,
		// Return the customer_id so the client can update their local state if needed
		stripe_customer_id: customer.id
	};

		printLog(`🟡 Payment Sheet response: ${JSON.stringify(response)}`);
		printLog(`🟡 Payment Intent details: ${JSON.stringify({
			id: paymentIntent.id,
			payment_method_types: paymentIntent.payment_method_types,
			amount: paymentIntent.amount,
			currency: paymentIntent.currency
		})}`);

		return Response.json(response);
	} catch (error) {
		console.log(`❌ Payment Sheet API Error: ${error}`);
		console.log(`❌ Error details: ${JSON.stringify(error, null, 2)}`);
		
		return Response.json(
			{ 
				error: "Payment Sheet creation failed",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}