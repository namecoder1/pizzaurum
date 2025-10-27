#!/bin/bash

# Development startup script
echo "🚀 Starting Pizzaurum development server..."

# Set development environment variables
export APP_ENV=development
export EXPO_PUBLIC_BASE_URL=http://172.20.10.5:8081
export EXPO_PUBLIC_STRIPE_PUBLIC_KEY_TEST=pk_test_51RfJg9PSHwMwNxaX4U1UnRgiORLhR0WGo3N3ECjVoQoSxysrKbj4VNEdmPyAM83EOU0Jfgh2P0iBPrFgIz9u3rGm001Tk8SZm8
export NODE_ENV=development

echo "📝 Environment variables set:"
echo "   APP_ENV=$APP_ENV"
echo "   EXPO_PUBLIC_BASE_URL=$EXPO_PUBLIC_BASE_URL"
echo "   EXPO_PUBLIC_STRIPE_PUBLIC_KEY_TEST=$EXPO_PUBLIC_STRIPE_PUBLIC_KEY_TEST"
echo "   NODE_ENV=$NODE_ENV"

# Start the development server
echo "🌐 Starting Expo development server..."
expo start --web
