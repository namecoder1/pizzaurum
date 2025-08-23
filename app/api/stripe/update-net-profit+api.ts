import { supabaseAdmin } from "@/lib/supabase-admin";
import { printLog } from "@/lib/utils";
import { stripe } from "@/utils/stripe-server";

// Helper function to get actual Stripe fees and payment issuer for a payment
async function getStripeFeesAndPaymentMethod(paymentIntentId: string): Promise<{ 
  fee: number; 
  netAmount: number; 
  paymentIssuer: string;
}> {
  try {
    printLog(`Fetching Stripe fees and payment method for payment intent: ${paymentIntentId}`);
    
    // Recupera i charges
    const charges = await stripe.charges.list({
      payment_intent: paymentIntentId,
    });

    // Recupera il primo charge (di solito ce n'è solo uno)
    const charge = charges.data[0];

    if (charge && charge.balance_transaction) {
      // Recupera la balance transaction separatamente
      const balanceTransaction = await stripe.balanceTransactions.retrieve(
        typeof charge.balance_transaction === 'string' 
          ? charge.balance_transaction 
          : charge.balance_transaction.id
      );

      // Stripe amounts are in cents, convert to euros
      const netAmount = balanceTransaction.net / 100;
      const fee = balanceTransaction.fee / 100;
      const grossAmount = balanceTransaction.amount / 100;

      // Get payment issuer - prima prova con i dettagli del charge
      let paymentIssuer = 'Unknown';
      if (charge.payment_method_details) {
        if (charge.payment_method_details.type === 'card' && charge.payment_method_details.card) {
          paymentIssuer = charge.payment_method_details.card.wallet?.type || 
                         charge.payment_method_details.card.brand || 
                         'Unknown';
        } else if (charge.payment_method_details.type === 'satispay') {
          paymentIssuer = 'Satispay';
        } else {
          // Per altri tipi di payment method, usa il tipo stesso
          paymentIssuer = charge.payment_method_details.type.charAt(0).toUpperCase() + charge.payment_method_details.type.slice(1);
        }
      }
      
      // Se non abbiamo trovato il payment issuer dai dettagli del charge, prova con il PaymentIntent
      if (paymentIssuer === 'Unknown') {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['payment_method']
          });
          
          if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
            const paymentMethod = paymentIntent.payment_method as any;
            
            if (paymentMethod.type === 'card' && paymentMethod.card) {
              paymentIssuer = paymentMethod.card.wallet?.type || 
                             paymentMethod.card.brand || 
                             'Unknown';
            } else if (paymentMethod.type === 'satispay') {
              paymentIssuer = 'Satispay';
            } else {
              // Per altri tipi di payment method, usa il tipo stesso
              paymentIssuer = paymentMethod.type.charAt(0).toUpperCase() + paymentMethod.type.slice(1);
            }
          }
        } catch (error) {
          printLog(`Error retrieving PaymentIntent for payment issuer: ${error}`, true);
        }
      }

      printLog(`✅ Actual Stripe data for ${paymentIntentId}: grossAmount: €${grossAmount.toFixed(2)}, netAmount: €${netAmount.toFixed(2)}, fees: €${fee.toFixed(2)}, paymentIssuer: ${paymentIssuer}, currency: ${charge.currency}`);

      return { fee: fee, netAmount: netAmount, paymentIssuer: paymentIssuer };
    } else {
      printLog(`No balance transaction found for payment intent: ${paymentIntentId}`, true);
      // Fallback: calculate estimated fees
      const amount = charge ? charge.amount / 100 : 0;
      const estimatedFee = (amount * 0.029) + 0.30;
      const netAmount = amount - estimatedFee;
      return { fee: estimatedFee, netAmount: Math.max(0, netAmount), paymentIssuer: 'Unknown' };
    }
  } catch (error) {
    printLog(`Error retrieving charge details for net profit: ${error}`, true);
    // Fallback to estimated fees
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const amount = paymentIntent.amount / 100;
    const estimatedFee = (amount * 0.029) + 0.30;
    const netAmount = amount - estimatedFee;
    return { fee: estimatedFee, netAmount: Math.max(0, netAmount), paymentIssuer: 'Unknown' };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, paymentIntentId } = body;

    if (!orderId || !paymentIntentId) {
      return Response.json(
        { error: 'Missing orderId or paymentIntentId' },
        { status: 400 }
      );
    }

    printLog(`Updating net_profit and payment_issuer for order ${orderId} with payment intent ${paymentIntentId}`);

    // Get actual Stripe fees and payment method
    const { fee, netAmount, paymentIssuer } = await getStripeFeesAndPaymentMethod(paymentIntentId);
    const actualNetProfit = Math.round(netAmount * 100); // Convert to cents

    // Ensure we have a Supabase admin client
    const admin = supabaseAdmin();
    if (!admin) {
      return Response.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }

    // Update the order with actual net profit and payment issuer
    const { data, error } = await admin
      .from("orders")
      .update({ 
        net_profit: actualNetProfit,
        payment_issuer: paymentIssuer
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      printLog(`Error updating net_profit and payment_issuer: ${error}`, true);
      return Response.json(
        { error: 'Failed to update net_profit and payment_issuer', details: error },
        { status: 500 }
      );
    }

    printLog(`✅ Successfully updated net_profit to €${netAmount.toFixed(2)} and payment_issuer to ${paymentIssuer} for order ${orderId}`);

    return Response.json({
      success: true,
      orderId,
      paymentIntentId,
      actualFees: fee,
      netProfit: netAmount,
      netProfitCents: actualNetProfit,
      paymentIssuer: paymentIssuer
    });

  } catch (error) {
    printLog(`Error in update-net-profit API: ${error}`, true);
    return Response.json(
      { error: 'Failed to update net_profit and payment_issuer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 