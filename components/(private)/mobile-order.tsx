import { deleteOrder, processRefund, updateOrderStatus } from '@/lib/orders-actions'
import { OrderProductProps, OrderProps } from '@/types/types'
import { handleDeleteOrder, handleRefundButtonPress, handleRefundOrder, shouldShowRefundButton } from '@/utils/order-actions'
import { AlertTriangle, TruckIcon } from 'lucide-react-native'
import React, { useState, useEffect } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import Button from '../ui/button'
import ConfirmationDialog from '../ui/confirmation-dialog'
import SetStatusButton from './set-status-button'
import StatusBadge from './status-badge'

const MobileOrder = ({ 
  order,
  isAdmin,
  currentUserId,
  onOrderStatusUpdated,
  onOrderDeleted,
  onShowDetails,
  onReportOrder,
  onRefundOrder
}: { 
  order: OrderProps,
  isAdmin?: boolean,
  currentUserId?: string,
  onOrderStatusUpdated?: (orderId: string, newStatus: OrderProps['status']) => void,
  onOrderDeleted?: (orderId: string) => void,
  onShowDetails?: (order: OrderProps) => void,
  onReportOrder?: (orderId: string) => void,
  onRefundOrder?: (orderId: string) => void
}) => {
  const [showRefundConfirmation, setShowRefundConfirmation] = useState(false);

  // Debug: Track order changes
  useEffect(() => {
    console.log(`🟡 MobileOrder: Order ${order.id} status changed to ${order.status}`);
  }, [order.status, order.id]);

  // Verifica che l'ordine abbia tutti i dati necessari
  if (!order.id || !order.user_id || !order.products || !order.created_at) {
    return null;
  }

  return (
    <View
      className="bg-white p-5 rounded-xl border border-gray-100 mb-4 mx-4 shadow-sm"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Header Section */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-col items-start">
          <View className="flex-row items-center justify-between w-full gap-x-2">
            <View className='flex-row items-center gap-x-1.5'>
              <TruckIcon size={20} className='inline-block' />
              <Text className="text-xl flex flex-row items-center font-bold text-gray-900">
                Ordine #{order.id.slice(0, 8)}
              </Text>
            </View>
            <StatusBadge status={order.status as OrderProps['status']} isRefunded={order.is_refunded} />
          </View>

        </View>
      </View>

      {/* Products Section */}
      <View className="rounded-lg py-4 mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-3">Prodotti ordinati:</Text>
        {order.products.map((product: OrderProductProps, index: number) => (
          <View key={product.id || `product-${index}`} className="mb-3 last:mb-0">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-base font-medium text-gray-900">
                {product.name}
              </Text>
              <Text className="text-sm font-semibold text-gray-600 px-2 py-1 rounded-full">
                x{product.quantity}
              </Text>
            </View>
            {product.extras && product.extras.length > 0 && (
              <View className="ml-4">
                {product.extras.map((extra: any, extraIndex: number) => (
                  <View key={extra.id || `extra-${extraIndex}`} className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm text-gray-600">
                      + {extra.name}
                    </Text>
                    <Text className="text-sm font-medium text-gray-700">
                      €{extra.price}
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
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-semibold text-sm">Spese di consegna:</Text>
          <Text className="text-gray-600 text-sm font-normal">
            3.00€
          </Text>
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-500 mb-1">Data ordine</Text>
        <Text className="text-sm font-medium text-gray-700">
          {new Date(order.created_at).toLocaleDateString("it-IT", {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
        <View className='flex flex-row items-center justify-between'>
          <Text className="text-xs text-gray-500 mb-1">Data consegna</Text>
          <Text className="text-sm font-medium text-gray-700">
            {order.is_custom_time && order.customer_time ? new Date(order.customer_time).toLocaleDateString("it-IT", {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Prima possibile'}
          </Text>
        </View>

      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-xs text-gray-500 mb-1">Totale</Text>
        <Text className="text-xl font-bold text-gray-900">
          €{order.price?.toFixed(2) || "0.00"}
        </Text>
      </View>

      {/* Actions Section */}
      <View className="flex-row items-center mt-4 justify-between">
        {isAdmin && order.status !== 'reported' && order.status !== 'cancelled' ? (
          <TouchableOpacity
            className='bg-yellow-200 p-2 rounded-xl border border-amber-400 hover:bg-yellow-300/70 hover:border-amber-400/70'
            onPress={() => onReportOrder?.(order.id)}
          >
            <AlertTriangle size={16} className='text-yellow-600' />
          </TouchableOpacity>
        ) : <View />}
        <View className=''>
          {isAdmin ? (
            <SetStatusButton 
              status={order.status} 
              isDelivery={order.is_delivery} 
              orderId={order.id} 
              onStatusUpdated={onOrderStatusUpdated}
              updateOrderStatus={updateOrderStatus}
            />
          ) : null
          }
        </View>
      </View>

      <View className='flex flex-row items-center justify-between mt-4 gap-2'>
      {shouldShowRefundButton({
        order: order,
        isAdmin: isAdmin || false,
        currentUserId: currentUserId || ''
      }) && (
        <Button
          text={order.status === 'pending' && (order.payment === 'online' || order.is_delivery) ? (isAdmin ? 'Rimborsa' : 'Richiedi rimborso') : 'Annulla ordine'}
          variant='destructive'
          className='flex-1'
          onPress={order.payment === 'online' || order.is_delivery ? () => handleRefundButtonPress({
            onRefundOrder: onRefundOrder,
            orderId: order.id
          }) : () => handleDeleteOrder({
            deleteOrder: deleteOrder,
            orderId: order.id,
            onOrderStatusUpdated: onOrderStatusUpdated
          })}
        />
      )}

      
      <Button
        text="Dettagli ordine"
        onPress={() => onShowDetails?.(order)} 
        className='flex-1'
      />
      </View>
      {/* Details Button */}

      {/* Refund Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRefundConfirmation}
        onClose={() => setShowRefundConfirmation(false)}
        onConfirm={() => handleRefundOrder({
          processRefund: processRefund,
          orderId: order.id,
          currentUserId: currentUserId || '',
          isAdmin: isAdmin || false,
          onOrderStatusUpdated: onOrderStatusUpdated
        })}
        title="Conferma Rimborso"
        message={`Sei sicuro di voler rimborsare l'ordine #${order.id.slice(0, 8)}? Questa azione processerà il rimborso di €${order.price?.toFixed(2)} tramite Stripe e non può essere annullata.`}
        confirmText="Rimborsa"
        cancelText="Annulla"
        variant="danger"
      />
    </View>
  )
}

export default MobileOrder
