import OrderStatusDisplayer from '@/components/(private)/(customer)/order-status-displayer';
import { Rating } from '@/components/(private)/(customer)/star-rating';
import StatusBadge from '@/components/(private)/status-badge';
import Button from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Loader from '@/components/ui/Loader';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useOrderFeesUpdater } from '@/hooks/useOrderFeesUpdater';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { useOrderProductsEnrichment } from '@/hooks/useOrderProductsEnrichment';
import { useOrdersWithRealtime } from '@/hooks/useOrdersWithRealtime';
import { usePurchaseEmailManager } from '@/hooks/usePurchaseEmailManager';
import { createClientSupabase } from '@/lib/supabase';
import { formatDateTimeItalian, printLog } from '@/lib/utils';
import { OrderProps } from '@/types/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Store, Truck, VerifiedIcon } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CustomerOrderPage = () => {
  const [ratings, setRatings] = React.useState({
    product: 0,
    service: 0,
    delivery: 0,
  })
  const [comment, setComment] = React.useState('');
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const { id } = useLocalSearchParams();
  const os = Platform.OS
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Hook per le notifiche degli ordini
  const orderNotifications = useOrderNotifications({
    enabled: !!session?.user?.id,
    userId: session?.user?.id
  });

  // Hook centralizzato per la gestione delle email di acquisto
  const purchaseEmailManager = usePurchaseEmailManager({
    userId: session?.user?.id
  });

  // Usa il hook real-time per gli ordini del customer
  const {
    orders,
    loading: ordersLoading,
    isConnected,
    updateOrder: updateOrderInHook
  } = useOrdersWithRealtime({
    userId: session?.user?.id || '',
    enabled: !!session?.user?.id,
    onOrderUpdate: (updatedOrder: OrderProps) => {
      printLog(`🟡 Ordine aggiornato in dettaglio customer: ${updatedOrder.id}`);
      orderNotifications.handleOrderUpdate(updatedOrder);
    },
    onOrderInsert: (newOrder: OrderProps) => {
      orderNotifications.handleOrderInsert(newOrder);
    },
    onOrderDelete: (orderId: string) => {
      orderNotifications.handleOrderDelete(orderId);
    },
    onError: (error: any) => {
      printLog(`❌ Errore real-time dettaglio customer: ${error}`, true);
    }
  });

  // Trova l'ordine corrente dai dati real-time
  const order = orders.find(o => o.id === id) || null;

  // Auto-update fees and payment method when viewing order
  const { isUpdating: isUpdatingFees } = useOrderFeesUpdater({
    order,
    enabled: !!order && !!order.stripe_payment_intent_id,
  });

  // Enrich products for this order
  const { enrichedProducts, isEnriching: isEnrichingProducts } = useOrderProductsEnrichment({
    products: order?.products || [],
    enabled: !!order
  });

  // Create enriched order
  const enrichedOrder = order ? {
    ...order,
    products: enrichedProducts
  } : null;



  // Fetch iniziale se l'ordine non è ancora nei dati real-time
  useEffect(() => {
    const fetchOrderIfNeeded = async () => {
      if (!id || !session?.user?.id) return;

      // Se l'ordine non è ancora nei dati real-time, lo fetchiamo manualmente
      if (!order) {
        try {
          const supabase = createClientSupabase();
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .eq('user_id', session.user.id)
            .single();

          if (error) {
            printLog(`❌ Errore caricamento ordine: ${error}`, true);
            setError('Errore nel caricamento dell\'ordine');
            setLoading(false);
            return;
          }

          // L'ordine verrà aggiunto automaticamente ai dati real-time
          printLog(`🟡 Ordine caricato manualmente: ${data.id}`);
        } catch (err) {
          printLog(`❌ Errore caricamento ordine: ${err}`, true);
          setError('Errore nel caricamento dell\'ordine');
        } finally {
          setLoading(false);
        }
      } else {
        // L'ordine è già nei dati real-time
        setLoading(false);
      }
    };

    fetchOrderIfNeeded();
  }, [id, order, session?.user?.id]);

  // Send email when order is loaded and email not sent yet (WEB ONLY)
  useEffect(() => {
    const checkAndSendEmail = async () => {
      if (os === 'web' && enrichedOrder && session?.user?.id) {
        printLog(`📧 Web: Checking email status for order ${enrichedOrder.id}`);
        await purchaseEmailManager.sendPurchaseEmailForOrder(enrichedOrder.id);
      }
    };

    checkAndSendEmail();
  }, [enrichedOrder?.id, session?.user?.id, os, purchaseEmailManager]); // Added purchaseEmailManager dependency

  const handleSubmit = async () => {
    const supabase = createClientSupabase();

    // Validazione campi obbligatori
    if (ratings.product === 0 || ratings.service === 0) {
      setErrorMessage("Per favore valuta almeno il pasto e il servizio");
      return;
    }

    // Se è un ordine con delivery, il delivery rating è obbligatorio
    if (order?.is_delivery && ratings.delivery === 0) {
      setErrorMessage("Per favore valuta anche la consegna");
      return;
    }

    setIsSubmittingReview(true);

    try {
      // Creo l'oggetto recensione
      const reviewData = {
        product_rating: ratings.product,
        service_rating: ratings.service,
        ...(order?.is_delivery && { delivery_rating: ratings.delivery }),
        ...(comment.trim() && { comment: comment.trim() }),
        created_at: new Date().toISOString(),
      };

      // Aggiorno l'ordine con la recensione
      const { error } = await supabase
        .from("orders")
        .update({ customer_review: reviewData })
        .eq("id", id);

      if (error) throw error;

      setErrorMessage("Grazie per la tua recensione!");

      // Aggiorno lo stato locale dell'ordine per chiudere il dialog
      // L'aggiornamento verrà ricevuto automaticamente via real-time
      updateOrderInHook(id as string, { customer_review: reviewData as any });
    } catch (error) {
      printLog(`❌ Errore salvare recensione: ${error}`, true);
      setErrorMessage("Errore nel salvare la recensione, riprova");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || ordersLoading) return <Loader size="fullscreen" text="Caricamento ordine..." />

  if (os === 'web') {
    if (error || !enrichedOrder) {
      return (
        <>
          <Head>
            <title>Ordine non trovato | Pizzaurum</title>
            <meta name="description" content="Ordine non trovato" />
          </Head>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
              <p className="text-gray-600 mb-4">{error || 'Ordine non trovato'}</p>
              <button 
                onClick={() => router.push('/orders')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Torna ai tuoi ordini
              </button>
            </div>
          </div>
        </>
      );
    }
  
    return (
      <>
        <Head>
          <title>Ordine #{enrichedOrder?.id.slice(0, 8)} | Pizzaurum</title>
          <meta name="description" content={`Ordine #${enrichedOrder?.id.slice(0, 8)}`} />
        </Head>
        <section className="max-w-7xl mx-auto w-full px-4 py-8">
          <div className='flex flex-row items-center justify-between'>
            <div className="flex items-center gap-4">
              <h2 className='text-2xl font-bold flex flex-row items-center gap-1.5'>
                {enrichedOrder.customer_review !== null && <VerifiedIcon color='blue' size={20} className='mb-1' />}
                Ordine {enrichedOrder?.id.slice(0, 8)}c
              </h2>
              <StatusBadge status={enrichedOrder?.status as OrderProps['status']} isRefunded={enrichedOrder.is_refunded} />
            </div>
            <div>
              {enrichedOrder.is_delivery ? 
                <p className='flex flex-row items-center gap-1 border py-1 px-2 rounded-xl border-gray-300 border-dashed'><Truck size={16} className='mb-0.5' />Consegna</p>
                : <p className='flex flex-row items-center gap-1 border py-1 px-2 rounded-xl border-gray-300 border-dashed'><Store size={16} className='mb-0.5' />Ritiro</p>
              }
            </div>
          </div>
    
          <div className='flex flex-row items-center justify-between'>
            <div className='flex flex-row items-center gap-2'>
              <p className='text-sm text-gray-500'>Data ordine: {formatDateTimeItalian(enrichedOrder?.created_at as string)}</p>
            </div>
          </div>
    
          <Separator className='my-4'/>
    
          <div className='flex flex-col gap-2'>
            {enrichedOrder?.products.map((product) => (
              <div key={product.id} className='flex flex-row items-start justify-between'>
                <div className='flex-1'>
                  <p className='text-gray-500 font-medium'>{product.name}</p>
                  {product.extras.map((extra) => (
                    <div key={extra.name} className='flex flex-row items-center ml-4 mt-1'>
                      <p className='text-sm text-gray-500'>- {extra.name}</p>
                    </div>
                  ))}
                </div>
                <div className='flex flex-col items-end ml-4'>
                  <p className='font-semibold text-lg'>{product.price.toFixed(2)}€</p>
                  {product.extras.map((extra) => (
                    <div key={extra.name} className='mt-1'>
                      <p className='text-sm font-semibold'>{extra.price.toFixed(2)}€</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Separator className='my-1'/>
            <div className='flex flex-row items-center justify-between'>
              <p className='text-sm text-gray-500'>Totale</p>
              <p className='text-xl font-semibold'>{enrichedOrder?.price.toFixed(2)}€</p>
            </div>
          </div>
          
          <div className='mt-10'>
            <h3 className='text-lg font-bold'>Stato del tuo ordine</h3>
            <div className='mt-4'>
              <OrderStatusDisplayer status={enrichedOrder?.status as OrderProps['status']} order={enrichedOrder as OrderProps} />
            </div>
          </div>

          {enrichedOrder.status === 'completed' && enrichedOrder.customer_review === null && (
            <Dialog open={enrichedOrder.status === "completed" && !enrichedOrder.customer_review}>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Lascia una recensione</DialogTitle>
                <DialogDescription>
                  Ti invitiamo a lasciare una recensione per il nostro servizio.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Quanto sei soddisfatto/a del pasto?{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Rating rating={ratings.product} setRating={(rating) => setRatings({ ...ratings, product: rating as number })} />
                  </div>

                  {enrichedOrder.is_delivery && (
                    <div>
                      <Label className="text-sm font-medium">
                        Quanto sei soddisfatto/a della consegna?{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Rating
                        rating={ratings.delivery}
                        setRating={(rating) => setRatings({ ...ratings, delivery: rating as number })}
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">
                      Quanto sei soddisfatto/a del servizio?{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Rating rating={ratings.service} setRating={(rating) => setRatings({ ...ratings, service: rating as number })} />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      Se vuoi, puoi lasciare un commento
                    </Label>
                    <Textarea
                      value={comment}
                      onChange={(e) =>
                        setComment(e.nativeEvent.text)
                      }
                      placeholder="Il tuo commento (facoltativo)..."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onPress={handleSubmit}
                    disabled={isSubmittingReview}
                    className="w-full sm:w-auto"
                    text={isSubmittingReview ? "Invio in corso..." : "Invia recensione"}
                  />
                </div>
              </form>
              </DialogContent>
            </Dialog>
          )}
        </section>
      </>
    );
  }

  if (error || !enrichedOrder) {
    return (
      <View className="min-h-screen flex items-center justify-center">
        <View className="text-center">
          <Text className="text-2xl font-bold text-red-600 mb-4">Errore</Text>
          <Text className="text-gray-600 mb-4">{error || 'Ordine non trovato'}</Text>
          <Button
            onPress={() => router.push('/orders')}
            text="Torna ai tuoi ordini"
          />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView>
      <ScrollView>
        <View className="p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold">Ordine #{enrichedOrder.id.slice(0, 8)}</Text>
            <StatusBadge status={enrichedOrder?.status as OrderProps['status']} isRefunded={enrichedOrder.is_refunded} />
          </View>
          <View className="flex-row items-center justify-between mt-4">
            <View>
              {enrichedOrder.products.map((product) => (
                <View key={product.id} className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">{product.name}</Text>
                  <Text className="text-sm text-gray-500">€{product.price.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className="flex-row items-center justify-between mt-4">
            <Text className="text-sm text-gray-500">Data ordine</Text>
            <Text className="text-sm text-gray-500">{formatDate(enrichedOrder.created_at)}</Text>
          </View>
          <View className="flex-row items-center justify-between mt-4">
            <Text className="text-sm text-gray-500">Totale</Text>
            <Text className="text-sm text-gray-500">€{enrichedOrder.price.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )

};

export default CustomerOrderPage;