import { deleteOrder, updateOrderStatus } from '@/lib/orders-actions'
import { mapReportCategoryToItalian } from '@/lib/utils'
import { OrderProps } from '@/types/types'
import { handleDeleteOrder, handleRefundButtonPress, shouldShowRefundButton } from '@/utils/order-actions'
import { Link } from 'expo-router'
import { AlertTriangle, Truck } from 'lucide-react-native'
import React, { useEffect } from 'react'
import Button from '../ui/button'
import { Separator } from '../ui/separator'
import SetStatusButton from './set-status-button'
import StatusBadge from './status-badge'

const WebOrder = ({
  order,
  isAdmin,
  currentUserId,
  onOrderDeleted,
  onOrderStatusUpdated,
  onReportOrder,
  onRefundOrder,
  showReport
}: {
  order: OrderProps,
  isAdmin?: boolean,
  currentUserId?: string,
  onOrderDeleted?: (orderId: string) => void,
  onOrderStatusUpdated?: (orderId: string, newStatus: OrderProps['status']) => void,
  onReportOrder?: (orderId: string) => void,
  onRefundOrder?: (orderId: string) => void,
  showReport?: boolean
}) => {

  // Debug: Track order changes
  useEffect(() => {
    console.log(`🟡 WebOrder: Order ${order.id} status changed to ${order.status}`);
  }, [order.status, order.id]);

  // Verifica che l'ordine abbia tutti i dati necessari
  if (!order.id || !order.user_id || !order.products || !order.created_at) {
    return null;
  }

  return (
    <>
      <Link href={isAdmin ? `/(private)/(admin)/ordini/${order.id}` : `/(private)/(customer)/orders/${order.id}`} asChild>
        <div
          className="bg-white flex flex-col h-full justify-between rounded-3xl border border-gray-200 p-6 cursor-pointer"
        >
          <div>
            <div className="flex flex-row items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {order.is_delivery ? <Truck size={20} className="mr-2 inline-block" /> : null}
                  Ordine #{order.id.slice(0, 8)}
                </h3>
                <p className="text-gray-600 text-sm">
                  {new Date(order.created_at).toLocaleDateString("it-IT")}
                </p>
              </div>
              <StatusBadge status={(order.status)} isRefunded={order.is_refunded} />
            </div>
            
            {/* Products Section */}
            <div className="mb-4">
              {order.products.map((product, index) => (
                <div key={product.id || `product-${index}`} className="mb-2">
                  <div className="flex flex-row items-center justify-between">
                    <span className="text-sm font-semibold">
                      {product.name} {product.quantity}x
                    </span> 
                    <span className="text-gray-600 text-sm font-normal">
                      {product.price.toFixed(2)}€
                    </span>
                  </div>
                  {product.extras && product.extras.length > 0 && (
                    <div className="ml-4 mt-1">
                      {product.extras.map((extra, extraIndex) => (
                        <div key={`${product.id}-extra-${extraIndex}`} className="flex flex-row items-center justify-between">
                          <span className="text-gray-600 text-xs font-normal">
                            - {extra.name}
                          </span>
                          <span className="text-gray-600 text-xs font-normal">
                            {extra.price.toFixed(2)}€
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <Separator className="my-2" />
            
            {/* Delivery Fee */}
            {order.is_delivery && (
              <div className="flex flex-row items-center justify-between mb-1">
                <span className="font-semibold text-sm">Spese di consegna:</span>
                <span className="text-gray-600 text-sm font-normal">
                  3.00€
                </span>
              </div>
            )}

            <div className='flex flex-row items-center justify-between text-sm text-gray-500 mb-2'>
              <p>{order.is_delivery ? 'Consegna:' : 'Ritiro:'}</p>
              <p className='font-semibold'>
                {order.is_custom_time && order.customer_time ? (
                  <span>
                    {new Date(order.customer_time).toLocaleDateString("it-IT", {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                ): (
                  <span>Prima possibile</span>
                )}
              </p>
            </div>
            
            {/* Total */}
            <div className="flex flex-row items-center justify-between">
              <span className="text-lg font-bold text-gray-800">
                Totale:
              </span>
              <span className="text-lg font-bold text-gray-800">
                {order.price?.toFixed(2) || "0.00"}€
              </span>
            </div>
          </div>

          
          
          {/* Actions Section */}
          <div
            className="flex flex-row items-center mt-4 justify-between"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {isAdmin && order.status !== 'reported' && order.status !== 'cancelled' && showReport ? (
              <button 
                className='bg-yellow-200 p-2 mr-2 rounded-xl border border-amber-400 hover:bg-yellow-300/70 hover:border-amber-400/70'
                onClick={() => {
                  onReportOrder?.(order.id);
                }}
              >
                <AlertTriangle size={16} className='text-yellow-600' />
              </button>
            ) : <div />}
            <div className='flex flex-row gap-2 justify-end'>
              {isAdmin && order.status == 'pending' && (
                <Button
                  variant='destructive'
                  text="Annulla"
                  onPress={() => handleDeleteOrder({
                    deleteOrder: deleteOrder,
                    orderId: order.id,
                    onOrderStatusUpdated: onOrderStatusUpdated
                  })}
                  className="w-fit"
                />
              )}
              {isAdmin ? (
                <SetStatusButton 
                  status={order.status} 
                  isDelivery={order.is_delivery} 
                  orderId={order.id} 
                  onStatusUpdated={onOrderStatusUpdated}
                  updateOrderStatus={updateOrderStatus}
                />
              ) : (
                shouldShowRefundButton({
                  order: order,
                  isAdmin: isAdmin || false,
                  currentUserId: currentUserId || ''
                }) ? (
                  <Button
                    text={order.payment === 'online' || order.is_delivery ? (isAdmin ? 'Rimborsa' : 'Richiedi rimborso') : 'Annulla ordine'}
                    variant='destructive'
                    className='w-fit ml-auto'
                    onPress={order.payment === 'online' || order.is_delivery ? () => handleRefundButtonPress({
                      onRefundOrder: onRefundOrder,
                      orderId: order.id
                    }) : () => handleDeleteOrder({
                      deleteOrder: deleteOrder,
                      orderId: order.id,
                      onOrderStatusUpdated: onOrderStatusUpdated
                    })}
                  />
                ) : (
                  <Button
                    disabled={true}
                    text={order.payment === 'online' || order.is_delivery ? (isAdmin ? 'Rimborsa' : 'Richiedi rimborso') : 'Annulla ordine'}
                    variant='destructive'
                    className='w-fit ml-auto'
                    onPress={() => {}}
                  />
                )
              )}
            </div>
              {order.status === 'reported' ? (
                <div className='flex flex-col gap-2 bg-orange-400/10 p-2 rounded-xl border border-dashed border-orange-500/20 flex-1 w-full'>
                  <div className='flex gap-2'>
                    <h4 className='text-orange-900 font-semibold text-md'>Dettagli:</h4>
                    <p className='text-orange-500'>{order.report?.details?.length && order.report?.details?.length > 100 ? order.report?.details?.slice(0, 100) + '...' : order.report?.details}</p>
                  </div>
                  <div className='flex flex-row gap-2'>
                    {order.report?.category.split(',').map((category) => (
                      <p key={category} className='text-orange-500 text-sm bg-orange-500/10 px-2 py-1 rounded-xl'>{mapReportCategoryToItalian(category.trim())}</p>
                    ))}
                  </div>
                </div>
              ) : null}
          </div>
        </div>
      </Link>
    </>
  )
}

export default WebOrder