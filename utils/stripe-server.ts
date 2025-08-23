import Stripe from 'stripe'

let secretKey: string | null

// Use APP_ENV if available, otherwise fallback to NODE_ENV
const currentEnv = process.env.APP_ENV || process.env.NODE_ENV

if (currentEnv === 'production' || currentEnv === 'preview') {
	// Production and preview use production keys
	secretKey = process.env.STRIPE_SECRET_KEY!
} else {
	// Development uses test keys
	secretKey = process.env.STRIPE_SECRET_KEY_TEST!
}

// Security check - prevent Stripe initialization with null key
if (!secretKey) {
	console.error('❌ Stripe secret key is missing!')
	console.error('Environment:', currentEnv)
	console.error('APP_ENV:', process.env.APP_ENV)
	console.error('NODE_ENV:', process.env.NODE_ENV)
	console.error('Available keys:', {
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
		STRIPE_SECRET_KEY_TEST: process.env.STRIPE_SECRET_KEY_TEST ? 'SET' : 'MISSING'
	})
	throw new Error(
		`Stripe secret key is missing for environment: ${currentEnv}. Please set the appropriate key in EAS secrets.`
	)
}

export const stripe = new Stripe(secretKey, {
	httpClient: Stripe.createFetchHttpClient(),
	apiVersion: '2025-06-30.basil',
	appInfo: {
		name: 'Pizzaurum'
	}
})