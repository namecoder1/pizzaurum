#!/bin/bash

# Script per setup con ngrok (log in tutti i terminali)
echo "🚀 Starting Development with Ngrok Setup"
echo "=========================================="
echo ""
echo "📋 Questo script ti guiderà nel setup con ngrok"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ Ngrok non è installato!"
    echo ""
    echo "Installa ngrok con uno di questi comandi:"
    echo "  brew install ngrok/ngrok/ngrok"
    echo "  oppure scarica da https://ngrok.com/download"
    echo ""
    exit 1
fi

echo "✅ Ngrok è installato"
echo ""

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI non è installato!"
    echo ""
    echo "Installa Stripe CLI:"
    echo "  brew install stripe/stripe-cli/stripe"
    echo ""
    exit 1
fi

echo "✅ Stripe CLI è installato"
echo ""

# Instructions
echo "📝 ISTRUZIONI:"
echo ""
echo "Questo script avvierà ngrok. Dopo dovrai:"
echo ""
echo "1️⃣  COPIARE l'URL ngrok (es. https://abc123.ngrok-free.app)"
echo ""
echo "2️⃣  In un ALTRO terminale, avviare Expo:"
echo "    npx expo start -c"
echo ""
echo "3️⃣  In un ALTRO terminale, avviare Stripe CLI:"
echo "    stripe listen --forward-to https://abc123.ngrok-free.app/api/stripe/webhook"
echo "    (sostituisci abc123 con il tuo URL)"
echo ""
echo "4️⃣  Aggiornare .env con:"
echo "    EXPO_PUBLIC_BASE_URL=https://abc123.ngrok-free.app"
echo ""
echo "5️⃣  Riavviare l'app mobile per applicare le modifiche"
echo ""
echo "=========================================="
echo ""
read -p "Premi INVIO per avviare ngrok o CTRL+C per annullare..."
echo ""

# Start ngrok
echo "🌐 Avvio ngrok su porta 8081..."
echo ""
echo "⚠️  IMPORTANTE: Copia l'URL 'Forwarding' qui sotto!"
echo ""
ngrok http 8081

