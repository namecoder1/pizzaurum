import { cleanProductName, printLog } from "@/lib/utils";
import { CURRENCY } from "@/utils/config";
import { stripe } from "@/utils/stripe-server";

export async function POST(req: Request) {
	const { amount, metadata, cartItems, user_id, user_email, stripe_customer_id } = await req.json()
	
	// Debug: Log environment variables and Stripe configuration
	printLog(`🔍 Environment debug:`, true);
	printLog(`- NODE_ENV: ${process.env.NODE_ENV}`, true);
	printLog(`- APP_ENV: ${process.env.APP_ENV}`, true);
	printLog(`- EXPO_PUBLIC_STRIPE_PUBLIC_KEY: ${process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY ? 'SET' : 'MISSING'}`, true);
	printLog(`- STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING'}`, true);
	printLog(`- STRIPE_SECRET_KEY_TEST: ${process.env.STRIPE_SECRET_KEY_TEST ? 'SET' : 'MISSING'}`, true);
	
	// Get the appropriate public key based on environment
	const pubKey = process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY


	// Use existing customer or create new one
	let customer;
	if (stripe_customer_id) {
		try {
			// Verify the customer exists and retrieve it
			customer = await stripe.customers.retrieve(stripe_customer_id);
		} catch (error) {
			customer = null;
		}
	}
	
	// If no existing customer found, create new one
	if (!customer) {
		const customerData: any = {};
		if (user_email) {
			customerData.email = user_email;
		}
		if (user_id) {
			customerData.metadata = { user_id };
		}
		
		customer = await stripe.customers.create(customerData);
	}
	const ephemeralKey = await stripe.ephemeralKeys.create(
		{ customer: customer.id },
		{ apiVersion: "2025-06-30.basil"}
	);

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

	const paymentIntent = await stripe.paymentIntents.create({
		amount: amount,
		currency: CURRENCY,
		customer: customer.id,
		metadata: enhancedMetadata,
		payment_method_types: [
			'card',
			'satispay',
			'revolut_pay',
			'amazon_pay',
			'apple_pay'
		]
	});

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

	return Response.json(response)
}