import { supabaseAdmin } from "@/lib/supabase-admin";
import { printLog } from "@/lib/utils";
import { stripe } from "@/utils/stripe-server";

export async function POST(request: Request) {
  const { customerId } = await request.json();

  if (!customerId) {
    return Response.json({ error: "Customer ID is required" }, { status: 400 });
  }

  try {
    // Ottieni gli addebiti (charges)
    const lastCharges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
      expand: ['data.payment_method_details', 'data.billing_details', 'data.refunds'],
    });
    
    // Filtra gli addebiti senza payment intent associato
    let chargesWithoutPaymentIntent = lastCharges.data.filter(c => !c.payment_intent);

    // Raggruppa gli addebiti per payment intent
    const grouped = lastCharges.data.reduce((acc: any, charge: any) => {
      const key = charge.payment_intent || 'legacy';
      if (!acc[key]) {
        acc[key] = {
          amount: charge.amount / 100,
          count: 1,
          currency: charge.currency,
          created: charge.created,
          status: charge.status
        };
      } else {
        acc[key].amount += charge.amount / 100;
        acc[key].count += 1;
      }
      return acc;
    }, {});
    
    // Ottieni i payment intents
    const lastPayments = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });

    // Ottieni tutti i charges per questo customer
    const allCharges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
      expand: ['data.refunds'],
    });

    // Ottieni i metodi di pagamento salvati
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Ottieni sottoscrizioni (se esistono)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
      expand: ['data.latest_invoice'],
    });

    // Verifica lo stato reale controllando i charges
    const updatedPayments = lastPayments.data.map((payment: any) => {
      
      // Trova tutti i charges associati a questo payment intent
      const relatedCharges = allCharges.data.filter((charge: any) => 
        charge.payment_intent === payment.id
      );
      
      
      // Verifica se qualcuno dei charges è stato rimborsato
      let hasRefunds = false;
      
      relatedCharges.forEach((charge: any) => {
        
        if (charge.refunded || charge.amount_refunded > 0 || 
            (charge.refunds && charge.refunds.data && charge.refunds.data.length > 0)) {
          hasRefunds = true;
        }
      });
      
      
      // Se ci sono rimborsi, aggiorna lo stato a "refunded"
      if (hasRefunds) {
        return {
          ...payment,
          status: 'refunded' as any,
          refunded: true
        };
      }
      
      return payment;
    });
    
    // Applica i cambiamenti
    lastPayments.data = updatedPayments;
    
    // Aggiorna anche i singoli addebiti per considerare i rimborsi
    chargesWithoutPaymentIntent = chargesWithoutPaymentIntent.map((charge: any) => {
      if (charge.refunded || (charge.refunds && charge.refunds.data && charge.refunds.data.length > 0)) {
        return {
          ...charge,
          status: 'refunded' as any
        };
      }
      return charge;
    }) as any;

    // Query Supabase per trovare gli ordini associati ai payment intents
    const paymentIntentIds = lastPayments.data.map((payment: any) => {
      // Estrai l'ID del payment intent dal client_secret
      // Il client_secret è nel formato "pi_3Rt7JvPSHwMwNxaX0N8qdpdL_secret_YlOCYgaoQKL2bajrEchGSZLXE"
      // Prendiamo solo la parte prima del secondo "_"
      const parts = payment.client_secret.split('_');
      const paymentIntentId = parts[0] + '_' + parts[1];
      return paymentIntentId;
    });


    // Ensure we have a Supabase admin client
    const admin = supabaseAdmin();
    if (!admin) {
      return Response.json({ error: "Supabase admin client not initialized" }, { status: 500 });
    }

    // Query Supabase per gli ordini
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id, stripe_payment_intent_id, status, created_at')
      .in('stripe_payment_intent_id', paymentIntentIds);

    if (ordersError) {
      printLog(`❌ Error querying orders: ${ordersError}`, true);
    } else {
      printLog(`🔍 Payment intent IDs being searched: ${paymentIntentIds}`);
    }

    // Crea una mappa per associare payment intents agli ordini
    const orderMap = new Map();
    if (orders) {
      orders.forEach((order: any) => {
        orderMap.set(order.stripe_payment_intent_id, {
          id: order.id,
          status: order.status,
          created_at: order.created_at,
          link: `/orders/${order.id}`
        });
      });
    }

    // Aggiungi i link degli ordini ai payment intents
    const paymentsWithOrders = lastPayments.data.map((payment: any) => {
      const paymentIntentId = payment.client_secret.split('_')[0] + '_' + payment.client_secret.split('_')[1];
      const orderData = orderMap.get(paymentIntentId);
      
      return {
        ...payment,
        order: orderData || null
      };
    });
    
    // Organizza i dati per una migliore visualizzazione
    const paymentSummary = {
      totalSpent: lastCharges.data.reduce((sum, charge) => 
        (charge.status === 'succeeded' && !charge.refunded) ? sum + charge.amount / 100 : sum, 0),
      successfulPayments: lastPayments.data.filter((p: any) => p.status === 'succeeded' && !p.refunded).length,
      refundedPayments: lastPayments.data.filter((p: any) => p.refunded || p.status === 'refunded').length,
      lastPaymentDate: lastPayments.data.length > 0 ? 
        new Date(lastPayments.data[0].created * 1000).toISOString() : null,
      savedCards: paymentMethods.data.length,
      activeSubscriptions: subscriptions.data.filter(s => s.status === 'active').length
    };

    return Response.json({
      lastChargesWithoutPaymentIntent: chargesWithoutPaymentIntent, 
      lastPayments: paymentsWithOrders, 
      grouped,
      paymentMethods: paymentMethods.data,
      subscriptions: subscriptions.data,
      summary: paymentSummary
    });
  } catch (error: any) {
    printLog(`❌ Error fetching payment data: ${error.message}`, true);
    return Response.json({ error: error.message }, { status: 500 });
  }
}