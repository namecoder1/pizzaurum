import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useOrderFeesUpdater } from '@/hooks/useOrderFeesUpdater'
import { updateOrderStatus } from '@/lib/orders-actions'
import { createClientSupabase } from '@/lib/supabase'
import { OrderProductProps, OrderProps, UserProps } from '@/types/types'
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet'
import { format } from 'date-fns'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import CustomBottomSheet from '../../ui/bottom-sheet'
import Button from '../../ui/button'
import SetStatusButton from '../set-status-button'
import StatusBadge from '../status-badge'

export interface BottomSheetOrderRef {
  present: () => void
  dismiss: () => void
}

interface BottomSheetOrderProps {
  order: OrderProps | null
  isAdmin: boolean
  onOrderStatusUpdated?: (orderId: string, newStatus: OrderProps['status']) => void
  onOrderDeleted?: (orderId: string) => void
  onOrderUpdate?: (orderId: string, updates: Partial<OrderProps>) => void
  orderSelectionTimestamp?: number
}

const BottomSheetOrder = forwardRef<BottomSheetOrderRef, BottomSheetOrderProps>(
  ({ order, isAdmin, onOrderStatusUpdated, onOrderDeleted, onOrderUpdate, orderSelectionTimestamp }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null)
    const snapPoints = useMemo(() => ['35%', '40%'], [])
    const [user, setUser] = useState<UserProps | null>(null)
    const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderProps['status'] | null>(null)
    const [shouldPresent, setShouldPresent] = useState(false)

    // Auto-update fees and payment method when viewing order
    const { isUpdating: isUpdatingFees, lastUpdateResult } = useOrderFeesUpdater({
      order,
      enabled: !!order && !!order.stripe_payment_intent_id,
    });

    // Update order when fees/payment issuer are updated
    useEffect(() => {
      if (lastUpdateResult?.success && onOrderUpdate) {
        const updates: Partial<OrderProps> = {};
        if (lastUpdateResult.netProfit !== undefined) {
          updates.net_profit = lastUpdateResult.netProfit;
        }
        if (lastUpdateResult.paymentIssuer) {
          updates.payment_issuer = lastUpdateResult.paymentIssuer;
        }
        if (Object.keys(updates).length > 0) {
          onOrderUpdate(order?.id as string, updates);
        }
      }
    }, [lastUpdateResult, onOrderUpdate, order?.id]);



    // Update local status when order prop changes
    useEffect(() => {
      if (order?.status) {
        console.log(`🟡 BottomSheetOrder: Order status updated to ${order.status} for order ${order.id}`);
        setCurrentOrderStatus(order.status)
      }
    }, [order?.status])

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    useImperativeHandle(ref, () => ({
      present: () => {
        // Assicurati che il bottom sheet sia pronto prima di presentarlo
        if (bottomSheetRef.current) {
          setShouldPresent(true);
          bottomSheetRef.current.present();
        }
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
        // Also call our dismiss handler to reset state
        handleDismiss();
      },
    }))

    // Presenta automaticamente il bottom sheet quando viene selezionato un ordine
    useEffect(() => {
      if (order && bottomSheetRef.current) {
        setShouldPresent(true);
        // Piccolo delay per assicurarsi che il componente sia completamente renderizzato
        const timer = setTimeout(() => {
          bottomSheetRef.current?.present();
        }, 100); // Aumentato il delay per maggiore stabilità
        
        return () => clearTimeout(timer);
      }
    }, [order, orderSelectionTimestamp]);

    // Handle dismiss event to reset state when bottom sheet is closed
    const handleDismiss = useCallback(() => {
      console.log('🟡 BottomSheetOrder: Bottom sheet dismissed');
      // Reset any internal state if needed
      setCurrentOrderStatus(null);
      setShouldPresent(false);
    }, []);

    // Fetch user data - deve essere prima dei controlli condizionali
    useEffect(() => {
      const fetchUser = async () => {
        if (!order?.user_id) {
          setUser(null)
          return
        }

        try {
          const supabase = await createClientSupabase()
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', order.user_id)
            .single()

          if (error) {
            console.error('Error fetching user:', error)
            setUser(null)
            return
          }

          if (userData) {
            // Create a partial user object with only the fields we need
            setUser(userData as unknown as UserProps)
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Error in fetchUser:', error)
          setUser(null)
        }
      }

      fetchUser()
    }, [order?.user_id])

    // Handle status updates from SetStatusButton
    const handleStatusUpdate = (orderId: string, newStatus: OrderProps['status']) => {
      setCurrentOrderStatus(newStatus)
      onOrderStatusUpdated?.(orderId, newStatus)
    }

    if (!order) return null

    // Verifica che l'ordine abbia tutti i dati necessari
    if (!order.id || !order.user_id || !order.products || !order.created_at) {
      return null
    } 

    const handleRefundOrder = async () => {
      try {
        if (order.payment === 'online' || order.is_delivery) {
          // Per ordini pagati online o delivery, gestisci il rimborso
          const { handleRefundButtonPress } = await import('@/utils/order-actions')
          handleRefundButtonPress({
            onRefundOrder: (orderId: string) => {
              // Chiama la callback parent se disponibile
              if (isAdmin) {
                // Admin può fare refund direttamente
                onOrderDeleted?.(orderId)
              } else {
                // Customer richiede rimborso
                onOrderDeleted?.(orderId)
              }
            },
            orderId: order.id
          })
        } else {
          // Per ordini pickup non pagati online, cancella direttamente
          const { deleteOrder } = await import('@/lib/orders-actions')
          await deleteOrder(order.id)
          onOrderDeleted?.(order.id)
        }
        bottomSheetRef.current?.dismiss()
      } catch (error) {
        console.error('Error handling order action:', error)
      }
    }

    return (
      <CustomBottomSheet
        bottomSheetRef={bottomSheetRef}
        snapPoints={snapPoints}
        renderBackdrop={renderBackdrop}
        index={2}
        onDismiss={handleDismiss}
      >
        <View className="flex-1 px-6">
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <View className="flex-row items-center justify-between">
              <View className="flex-col items-start">
                <View className="flex-row items-center justify-between w-full gap-2">
                  <Text className="text-2xl font-bold text-gray-900 mb-1">
                    Ordine #{order.id.slice(0, 8)}
                  </Text>
                  <StatusBadge status={currentOrderStatus || order.status} isRefunded={order.is_refunded} />
                </View>
              </View>
            </View>

            <Separator className='my-4' />

            {isAdmin && (
              <Card className='mb-4 p-4'>
                <Text className="text-sm font-semibold text-gray-700 mb-3">Dettagli cliente:</Text>
                <View className="flex-col space-y-1">
                  <View className='flex-row gap-x-2'>
                    <Text className="text-sm font-semibold text-gray-700">
                      Nome:
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {user?.name}
                    </Text>
                  </View>
                  <View className='flex-row gap-x-2'>
                    <Text className="text-sm font-semibold text-gray-700">
                      Telefono:
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {user?.phone}
                    </Text>
                  </View>
                  <View className='flex-row gap-x-2'>
                    <Text className="text-sm font-semibold text-gray-700">
                      Indirizzo:
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {user?.address}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Order Details */}
            <View className="rounded-lg mb-2">
              <Text className="text-md font-semibold text-gray-900 mb-3">Dettagli:</Text>
              <View className='flex flex-col gap-y-1'>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-600">Data ordine:</Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {new Date(order.created_at).toLocaleDateString("it-IT", {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-600">Data consegna:</Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {order.is_custom_time ? format(new Date(order.customer_time as string), 'dd/MM HH:mm') : 'Prima possibile'}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-600">Metodo di pagamento:</Text>
                  <Text className="text-sm font-medium text-gray-700">
                    {order.payment === 'online' ? 'Online' : order.payment === 'card' ? 'Carta' : 'Contanti'} ({order.payment_issuer ? order.payment_issuer : 'N/A'})
                  </Text>
                </View>
              </View>
            </View>

            {/* Products Section */}
            <View className="rounded-lg py-4 mb-4">
              <Text className="text-md font-semibold text-gray-900 mb-3">Prodotti:</Text>
              {order.products.map((product: OrderProductProps, index: number) => (
                <View key={product.id || `product-${index}`} className="pb-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-medium text-gray-900 flex-1">
                        {product.name} {' '}
                        x{product.quantity}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-sm font-semibold text-gray-700">
                        €{product.price?.toFixed(2) || "0.00"}
                      </Text>
                    </View>
                  </View>
                  {product.extras && product.extras.length > 0 && (
                    <View className="ml-4 ">
                      {product.extras.map((extra: any, extraIndex: number) => (
                        <View key={extra.id || `extra-${extraIndex}`} className="flex-row items-center justify-between mb-1">
                          <Text className="text-sm text-gray-600">
                            - {extra.name}
                          </Text>
                          <Text className="text-sm font-medium text-gray-700">
                            €{extra.price.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Delivery Fee */}
            {order.is_delivery && (
              <View className="rounded-lg mb-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-md font-semibold text-gray-900">Spese di consegna:</Text>
                  <Text className="text-sm font-semibold text-gray-700">€3.00</Text>
                </View>
              </View>
            )}

            {/* Total */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900">Totale:</Text>
                <Text className="text-xl font-bold text-gray-900">
                  €{order.price?.toFixed(2) || "0.00"}
                </Text>
              </View>
              {isAdmin && order.net_profit && (
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-sm text-gray-600">Netto ordine:</Text>
                  <Text className="text-sm font-medium text-gray-700">
                    €{(order.net_profit / 100).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View className="flex flex-row gap-2 pb-6">
              {isAdmin ? (
                <SetStatusButton
                  status={currentOrderStatus || order.status}
                  isDelivery={order.is_delivery}
                  orderId={order.id}
                  onStatusUpdated={handleStatusUpdate}
                  updateOrderStatus={updateOrderStatus}
                />
              ) : (
                null
              )}
              {(currentOrderStatus || order.status) === 'pending' && (
                <Button
                  text={order.payment === 'online' || order.is_delivery ? (isAdmin ? 'Rimborsa' : 'Richiedi rimborso') : 'Annulla ordine'}
                  onPress={handleRefundOrder}
                  variant="destructive"
                  className="flex-1"
                />
              )}
              <Button
                text="Chiudi"
                onPress={() => bottomSheetRef.current?.dismiss()}
                className="flex-1"
              />
            </View>
          </ScrollView>
        </View>
      </CustomBottomSheet>
    )
  }
)

BottomSheetOrder.displayName = 'BottomSheetOrder'

export default BottomSheetOrder