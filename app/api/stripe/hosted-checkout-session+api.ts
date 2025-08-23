import { formatAmountForStripe } from "@/lib/utils";
import { CURRENCY } from "@/utils/config";
import Stripe from "stripe";


export async function POST(request: Request) {
  let skey: string

  // Use APP_ENV if available, otherwise fallback to NODE_ENV
  const currentEnv = process.env.APP_ENV || process.env.NODE_ENV

  if (currentEnv === 'production' || currentEnv === 'preview') {
    skey = process.env.STRIPE_SECRET_KEY!
  } else {
    skey = process.env.STRIPE_SECRET_KEY_TEST!
  }

  const stripe = new Stripe(skey, {
    apiVersion: '2025-06-30.basil',
    appInfo: {
      name: 'Expo Starter'
    }
  })

  const amount = request.headers.get('amount');
  const amountNumber = amount ? Number(amount) : 0;
  const origin = request.headers.get('origin');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    submit_type: 'pay',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          product_data: {
            name: 'Order',
          },
          unit_amount: formatAmountForStripe(amountNumber, CURRENCY),
        }
      }
    ],
    success_url: `${origin}/result?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/`,
    ui_mode: 'hosted'
  })

  return Response.json({
    client_secret: session.client_secret,
    url: session.url
  })
}

