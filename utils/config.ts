// Configuration for client-side environment variables
// Only public keys should be exposed to the client

export const CURRENCY = 'eur';

const isProduction = process.env.NODE_ENV === 'production'

export const config = {
  // Stripe configuration (client-side safe)
  stripe: {
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY,
  },
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV === "development" || process.env.EXPO_PUBLIC_DEV === "true",
  isProduction: process.env.NODE_ENV === "production",
  
  // Supabase configuration (client-side safe)
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Webhook configuration (client-side safe)
  webhook: {
    // Events to handle
    events: {
      CHECKOUT_SESSION_COMPLETED: "checkout.session.completed",
      PAYMENT_INTENT_SUCCEEDED: "payment_intent.succeeded",
      PAYMENT_INTENT_PAYMENT_FAILED: "payment_intent.payment_failed",
      INVOICE_PAYMENT_SUCCEEDED: "invoice.payment_succeeded",
      INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
    }
  }
};