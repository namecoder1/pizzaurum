#!/bin/bash

# Development script for Stripe webhooks
echo "🚀 Starting Stripe development environment..."

# Set development environment variables
export APP_ENV=development
export NODE_ENV=development
export EXPO_PUBLIC_BASE_URL=http://172.20.10.5:8081

echo "📝 Environment variables set:"
echo "   APP_ENV=$APP_ENV"
echo "   NODE_ENV=$NODE_ENV"
echo "   EXPO_PUBLIC_BASE_URL=$EXPO_PUBLIC_BASE_URL"

echo ""
echo "🔧 Starting Stripe CLI webhook listener..."
echo "📍 Forwarding webhooks to: $EXPO_PUBLIC_BASE_URL/api/stripe/webhook"
echo ""
echo "💡 Tips:"
echo "   - Make sure your Expo dev server is running on port 8081"
echo "   - Check the terminal where you run 'npm run dev' for webhook logs"
echo "   - Use 'npm run test-webhook' to test the webhook endpoint"
echo ""

# Start Stripe CLI with better logging
stripe listen --forward-to localhost:8081/api/stripe/webhook --print-secret
