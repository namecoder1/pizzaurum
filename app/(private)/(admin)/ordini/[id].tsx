import PrivateLayout from '@/components/(private)/private-layout';
import SetStatusButton from '@/components/(private)/set-status-button';
import StatusBadge from '@/components/(private)/status-badge';
import Button from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Loader from '@/components/ui/Loader';
import { Separator } from '@/components/ui/separator';
import { useAdminOrdersWithRealtime } from '@/hooks/useAdminOrdersWithRealtime';
import { useOrderFeesUpdater } from '@/hooks/useOrderFeesUpdater';
import { useOrderProductsEnrichment } from '@/hooks/useOrderProductsEnrichment';
import { deleteOrder, processRefund, updateOrderStatus } from '@/lib/orders-actions';
import { createClientSupabase } from '@/lib/supabase';
import { formatDateTimeItalian, printLog } from '@/lib/utils';
import { OrderProps, UserProps } from '@/types/types';
import { handleDeleteOrder, handleRefundOrder } from '@/utils/order-actions';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import { Linking, Platform, Text, View } from 'react-native';

const OrderPage = () => {
  const os = Platform.OS
  const { id } = useLocalSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [userInfo, setUserInfo] = React.useState<UserProps | null>(null);

  // Usa il hook real-time per gli ordini
  const {
    orders,
    loading: ordersLoading,
    isConnected,
    updateOrder: updateOrderInHook
  } = useAdminOrdersWithRealtime({
    enabled: true,
    onOrderUpdate: (updatedOrder: OrderProps) => {
      printLog(`🟡 Ordine aggiornato in dettaglio admin: ${updatedOrder.id}`);
    },
    onError: (error: Error) => {
      printLog(`❌ Errore real-time dettaglio admin: ${error}`, true);
    }
  });

  // Trova l'ordine corrente dai dati real-time
  const order = orders.find(o => o.id === id) || null;

  // Auto-update fees and payment method when viewing order
  const { isUpdating: isUpdatingFees, lastUpdateResult } = useOrderFeesUpdater({
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



  // Fetch user info quando cambia l'ordine
  const fetchUserInfo = useCallback(async (userId: string) => {
    try {
      const supabase = await createClientSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user info:', error);
        setError('Errore nel caricamento delle informazioni del cliente');
      } else {
        setUserInfo(data as unknown as UserProps);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      setError('Errore nel caricamento delle informazioni del cliente');
    }
  }, []);

  // Fetch iniziale se l'ordine non è ancora nei dati real-time
  useEffect(() => {
    const fetchOrderIfNeeded = async () => {
      if (!id) return;

      // Se l'ordine non è ancora nei dati real-time, lo fetchiamo manualmente
      if (!order) {
        try {
          const supabase = await createClientSupabase();
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

          if (error) {
            console.error('Error fetching order:', error);
            setError('Errore nel caricamento dell\'ordine');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching order:', error);
          setError('Errore nel caricamento dell\'ordine');
          setLoading(false);
        }
      } else {
        // L'ordine è già nei dati real-time, fetchiamo solo le info utente
        fetchUserInfo(order.user_id);
        setLoading(false);
      }
    };

    fetchOrderIfNeeded();
  }, [id, order, fetchUserInfo]);

  // Aggiorna loading state quando i dati real-time sono pronti
  useEffect(() => {
    if (order && !loading) {
      fetchUserInfo(order.user_id);
    }
  }, [order, loading, fetchUserInfo]);

  if (loading || ordersLoading || isEnrichingProducts || isUpdatingFees) return <Loader size='fullscreen' text='Caricamento ordine...' />

  console.log(enrichedOrder)

  if (os === 'web') {
    if (error || !order) {
      return (
        <PrivateLayout title={`Ordine non trovato | Pizzaurum`} description="Ordine">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
              <p className="text-gray-600 mb-4">{error || 'Ordine non trovato'}</p>
              <button 
                onClick={() => router.push('/ordini')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Torna ai tuoi ordini
              </button>
            </div>
          </div>
        </PrivateLayout>
      )
    }

    return (
      <PrivateLayout title={`Ordine ${enrichedOrder?.id.slice(0, 8)} | Pizzaurum`} description="Ordine">
        <section className="max-w-7xl mx-auto w-full px-4 py-8">
          <div className='flex flex-row items-center justify-between'>
            <div>
              <div className='flex flex-row items-center justify-between'>
                <div className="flex items-center gap-4">
                  <h2 className='text-2xl font-bold'>Ordine {enrichedOrder?.id.slice(0, 8)}</h2>
                  <StatusBadge status={enrichedOrder?.status as OrderProps['status']} isRefunded={enrichedOrder?.is_refunded} />
                </div>
              </div>
              <p className='text-sm text-gray-500'>Data ordine: {formatDateTimeItalian(order?.created_at as string)}</p>
            </div>
            {enrichedOrder?.is_delivery ? (
              <p className='border border-gray-400 border-dashed rounded-xl px-3 py-1'>Consegna</p>
            ) : (
              <p className='border border-gray-400 border-dashed rounded-xl px-3 py-1'>Ritiro</p>
            )}
          </div>
    
          <Separator className='my-4'/>
    
          <div className='flex flex-col gap-2'>
            {enrichedOrder?.products?.map((product) => (
              <div key={product.id} className='flex flex-row items-start justify-between'>
                <div className='flex-1'>
                  <p className='text-gray-500 font-medium'>{product.name}</p>
                  {product?.extras?.map((extra) => (
                    <div key={extra.name} className='flex flex-row items-center ml-4 mt-1'>
                      <p className='text-sm text-gray-500'>- {extra.name}</p>
                    </div>
                  ))}
                </div>
                <div className='flex flex-col items-end ml-4'>
                  <p className='font-semibold text-lg'>{product.price.toFixed(2)}€</p>
                  {product?.extras?.map((extra) => (
                    <div key={extra.name} className='mt-1'>
                      <p className='text-sm font-semibold'>{extra.price.toFixed(2)}€</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Separator className='my-1'/>
            {enrichedOrder?.is_delivery && enrichedOrder?.customer_time && (
              <>
                <div className='flex flex-row items-center justify-between'>
                  <p className='text-sm text-gray-500'>Spese di consegna</p>
                  <p className='text-lg font-semibold'>3.00€</p>
                </div>
                <Separator className='my-1'/>
              </>
            )}
            <div className='flex flex-row items-center justify-between'>
              <p className='text-sm text-gray-500'>Totale</p>
              <p className='text-xl font-semibold'>{enrichedOrder?.price.toFixed(2)}€</p>
            </div>
          </div>
          
          <Card className='grid grid-cols-1 lg:grid-cols-2 gap-4 mt-10 p-6'>
            <div>
              <h3 className='text-lg font-semibold'>Informazioni sul cliente</h3>
              <div className='mt-2 flex flex-col items-start gap-2'>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Nome:</span> 
                  <span>{userInfo?.name}</span>
                </p>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Numero di telefono:</span> 
                  <span>{userInfo?.phone}</span>
                </p>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Email:</span> 
                  <span>{userInfo?.email}</span>
                </p>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Indirizzo:</span> 
                  <span>{userInfo?.address || 'N/A'}</span>
                </p>
              </div>
            </div>
            <div>
              <h3 className='text-lg font-bold'>Informazioni sull'ordine</h3>
              <div className='mt-2 flex flex-col items-start gap-2'>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Netto ordine:</span>
                  <span>{enrichedOrder?.net_profit ? (enrichedOrder.net_profit / 100).toFixed(2) : enrichedOrder?.price.toFixed(2)}€</span>
                </p>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Orario {enrichedOrder?.is_delivery ? 'consegna' : 'ritiro'}:</span>
                  <span>{enrichedOrder?.is_custom_time ? formatDateTimeItalian(enrichedOrder?.customer_time as string) : 'Appena possibile'}</span>
                </p>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Metodo di pagamento:</span>
                  <span>{enrichedOrder?.payment === 'online' ? 'Online' : enrichedOrder?.payment === 'card' ? 'Carta' : 'Contanti'} ({enrichedOrder?.payment_issuer ? enrichedOrder?.payment_issuer : 'N/A'})</span>
                </p>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Tipo ordine:</span>
                  <span>{enrichedOrder?.is_delivery ? 'Consegna' : 'Ritiro'}</span>
                </p>
              </div>
            </div>
          </Card>

          <div>
            {enrichedOrder?.is_refunded && (
              <Card className='mt-6 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between'>
                <h3 className='text-lg font-bold text-red-600 flex flex-row items-center gap-2'>
                  <AlertTriangle size={20} className='mb-1' /> Ordine rimborsato
                </h3>
                <p className='text-sm text-gray-500'>Il cliente ha ricevuto il rimborso il {formatDateTimeItalian(enrichedOrder.refunded_at as string)}</p>
              </Card>
            )}
          </div>
          
          {enrichedOrder?.report && (
            <Card className='mt-6 p-6'>
              <h3 className='text-lg font-bold text-red-600 mb-4'>⚠️ Report Segnalato</h3>
              <div className='flex flex-col gap-2'>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Categoria:</span>
                  <span className='bg-red-100 text-red-800 px-2 py-1 rounded text-sm'>
                    {enrichedOrder.report.category === 'fake_data' ? 'Dati falsi' :
                    enrichedOrder.report.category === 'spam_orders' ? 'Spam di ordini' :
                    enrichedOrder.report.category === 'suspicious_user' ? 'Utente sospetto' :
                    enrichedOrder.report.category === 'payment_fraud' ? 'Frode di pagamento' :
                    enrichedOrder.report.category === 'other' ? 'Altro' : enrichedOrder.report.category}
                  </span>
                </p>
                <p className='flex flex-row items-start gap-2'>
                  <span className='font-semibold'>Dettagli:</span>
                  <span className='text-gray-700'>{enrichedOrder.report.details}</span>
                </p>
                <p className='flex flex-row items-center gap-2'>
                  <span className='font-semibold'>Data segnalazione:</span>
                  <span>{formatDateTimeItalian(enrichedOrder.report.created_at)}</span>
                </p>
              </div>
            </Card>
          )}
          <div className='flex flex-row items-center justify-between gap- mt-10'>
            <h3 className='text-lg font-bold'>Qualcosa non va?</h3>
            <div className='flex flex-row items-center gap-4'>
              <div className=' flex items-center justify-between gap-4'>
                <div className='flex flex-row gap-2'>
                  {enrichedOrder?.status !== 'completed' && enrichedOrder?.status !== 'cancelled' && (
                    <Button
                      text={enrichedOrder?.payment === 'online' ? 'Rimborsa' : 'Annulla ordine'}
                      onPress={async () => {
                        if (enrichedOrder?.payment === 'online') {
                          // Gestisce il rimborso per ordini pagati online
                          await handleRefundOrder({
                            processRefund,
                            orderId: enrichedOrder?.id as string,
                            currentUserId: enrichedOrder?.user_id as string,
                            isAdmin: true,
                            onOrderStatusUpdated: (orderId, newStatus) => updateOrderInHook(orderId, { status: newStatus })
                          })
                        } else {
                          // Gestisce la cancellazione per ordini non pagati online (cash/card)
                          await handleDeleteOrder({
                            deleteOrder,
                            orderId: enrichedOrder?.id as string,
                            onOrderStatusUpdated: (orderId, newStatus) => updateOrderInHook(orderId, { status: newStatus })
                          })
                        }
                      }}
                      variant='destructive'
                    />
                  )}
                  <Button 
                    text='Contatta cliente'
                    onPress={() => {
                      Linking.openURL(`tel:${userInfo?.phone}`)
                    }}
                  />
                </div>
              </div>
              {enrichedOrder?.status !== 'completed' && (
                <>
                  <div className='w-[1px] h-10 bg-gray-300 mx-2' />
                  <SetStatusButton 
                    status={enrichedOrder?.status as OrderProps['status']} 
                    isDelivery={enrichedOrder?.is_delivery as boolean} 
                    orderId={enrichedOrder?.id as string} 
                    onStatusUpdated={(orderId, newStatus) => updateOrderInHook(orderId, { status: newStatus })}
                    updateOrderStatus={updateOrderStatus}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      </PrivateLayout>
    )
  }

  if (error || !order) {
    return (
      <View>
        <Text>Errore, nessun ordine trovato</Text>
      </View>
    )
  }

  return null
}

export default OrderPage