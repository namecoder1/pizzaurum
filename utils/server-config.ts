// Server-side configuration for sensitive keys
// This file should only be used in API routes and server-side code

// Use APP_ENV if available, otherwise fallback to NODE_ENV
const currentEnv = process.env.APP_ENV || process.env.NODE_ENV
const isProduction = currentEnv === 'production' || currentEnv === 'preview'

export const serverConfig = {
  // Stripe configuration (server-side only)
  stripe: {
    secretKey: isProduction ? process.env.STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_KEY_TEST,
    webhookSecret: isProduction ? process.env.STRIPE_WEBHOOK_SECRET : process.env.STRIPE_WEBHOOK_SECRET_TEST,
  },
  
  // Supabase configuration (server-side only)
  supabase: {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // Webhook configuration
  webhook: {
    // For development, we can bypass signature verification if no secret is set
    bypassSignatureInDev: true,
  }
};

// Helper function to get webhook secret
export function getWebhookSecret(): string | undefined {
  if (serverConfig.webhook.bypassSignatureInDev && !serverConfig.stripe.webhookSecret) {
    console.warn("⚠️  No webhook secret configured for development. Signature verification will be bypassed.");
    return undefined;
  }
  return serverConfig.stripe.webhookSecret;
}

// Helper function to check if we should bypass signature verification
export function shouldBypassSignatureVerification(): boolean {
  const isDev = currentEnv === 'development' || currentEnv === 'dev' || process.env.NODE_ENV === 'development';
  const hasNoSecret = !serverConfig.stripe.webhookSecret;
  const shouldBypass = serverConfig.webhook.bypassSignatureInDev && isDev;
  
  console.log(`🔍 Bypass check: currentEnv=${currentEnv}, isDev=${isDev}, hasNoSecret=${hasNoSecret}, shouldBypass=${shouldBypass}`);
  return shouldBypass;
} 