#!/usr/bin/env node

/**
 * Test script for Stripe webhooks
 * This script helps debug webhook issues by testing the webhook endpoint directly
 */

const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:8081/api/stripe/webhook';
const TEST_EVENT = {
  id: 'evt_test_webhook',
  object: 'event',
  api_version: '2025-06-30.basil',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'pi_test_123',
      object: 'payment_intent',
      amount: 2000,
      currency: 'eur',
      status: 'succeeded'
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test_123',
    idempotency_key: null
  },
  type: 'payment_intent.succeeded'
};

function makeRequest(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testWebhook() {
  console.log('🧪 Testing Stripe webhook endpoint...');
  console.log(`📍 URL: ${WEBHOOK_URL}`);
  console.log(`📦 Event: ${TEST_EVENT.type}`);
  
  try {
    const response = await makeRequest(
      WEBHOOK_URL,
      JSON.stringify(TEST_EVENT),
      {
        'stripe-signature': 't=1234567890,v1=test_signature'
      }
    );
    
    console.log('✅ Webhook test completed');
    console.log(`📊 Status: ${response.statusCode}`);
    console.log(`📄 Response: ${response.body}`);
    
    if (response.statusCode === 200) {
      console.log('🎉 Webhook is working correctly!');
    } else {
      console.log('❌ Webhook returned an error');
    }
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testWebhook();
