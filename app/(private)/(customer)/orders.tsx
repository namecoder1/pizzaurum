import MobileHeader from "@/components/(private)/(admin)/mobile-header";
import BottomSheetOrder, { BottomSheetOrderRef } from "@/components/(private)/(customer)/bottomsheet-order";
import LocalNotificationTest from "@/components/(private)/(customer)/local-notification-test";
import MobileOrder from "@/components/(private)/mobile-order";
import PageHeader from "@/components/(private)/page-header";
import PrivateLayout from "@/components/(private)/private-layout";
import WebOrder from "@/components/(private)/web-order";
import Loader from '@/components/ui/Loader';
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/auth-context';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { useOrderProductsEnrichmentForOrders } from '@/hooks/useOrderProductsEnrichment';
import { usePurchaseEmailManager } from '@/hooks/usePurchaseEmailManager';
import { useSavePushToken } from '@/hooks/useSavePushToken';
import { useCustomerOrdersWithRealtime } from '@/hooks/useUnifiedOrdersRealtime';
import { processRefund } from "@/lib/orders-actions";
import { printLog } from "@/lib/utils";
import { OrderProps } from "@/types/types";
import { useLocalSearchParams } from "expo-router";
import { CircleQuestionMark } from "lucide-react-native";
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";


const OrdersPage = () => {
  const { session } = useAuth();
  const os = Platform.OS;
  const { session_id, openOrderId } = useLocalSearchParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderProps | null>(null);
  const [showRefundConfirmation, setShowRefundConfirmation] = useState(false);
  const [orderToRefund, setOrderToRefund] = useState<OrderProps | null>(null);
  const bottomSheetRef = useRef<BottomSheetOrderRef>(null);
  const [orderSelectionTimestamp, setOrderSelectionTimestamp] = useState<number>(0);

  // Hook per salvare il push token
  useSavePushToken();

  // Hook per le notifiche degli ordini
  const orderNotifications = useOrderNotifications({
    enabled: !!session?.user?.id,
    userId: session?.user?.id
  });

  // Hook centralizzato per la gestione delle email di acquisto
  const purchaseEmailManager = usePurchaseEmailManager({
    userId: session?.user?.id
  });

  // Hook per gestire la navigazione dalle notifiche
  const { handleNotificationNavigation } = useNotificationNavigation({
    onOrderNotificationTap: (orderId: string) => {
      printLog(`📱 Notification navigation triggered for order: ${orderId}`);
      // L'ordine verrà aperto automaticamente tramite il parametro openOrderId
    }
  });

  // Usa il nuovo hook unificato per gli ordini con real-time
  const { 
    orders, 
    loading, 
    isConnected,
    updateOrder,
    removeOrder
  } = useCustomerOrdersWithRealtime(session?.user?.id || '', {
    enabled: !!session?.user?.id,
    onOrderInsert: (newOrder: OrderProps) => {
      printLog(`📱 Mobile: Nuovo ordine ricevuto in real-time: ${newOrder.id}`);
      orderNotifications.handleOrderInsert(newOrder);
    },
    onOrderUpdate: (updatedOrder: OrderProps) => {
      printLog(`📱 Mobile: Ordine aggiornato in real-time: ${updatedOrder.id} -> ${updatedOrder.status}`);
      orderNotifications.handleOrderUpdate(updatedOrder);
    },
    onOrderDelete: (orderId: string) => {
      printLog(`📱 Mobile: Ordine eliminato in real-time: ${orderId}`);
      orderNotifications.handleOrderDelete(orderId);
    },
    onError: (error: any) => {
      printLog(`📱 Mobile: Errore nella subscription real-time: ${error}`, true);
    }
  });

  // Debug logging for real-time connection status
  useEffect(() => {
    printLog(`📱 Mobile: Real-time connection status: ${isConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
  }, [isConnected]);

  // Debug logging for orders changes
  useEffect(() => {
    printLog(`📱 Mobile: Orders updated, count: ${orders.length}`);
    orders.forEach(order => {
      printLog(`📱 Mobile: Order ${order.id} status: ${order.status}`);
    });
  }, [orders]);

  // Enrich products for all orders while preserving order structure
  const { enrichedOrders, isEnriching: isEnrichingProducts } = useOrderProductsEnrichmentForOrders({
    orders: orders,
    enabled: orders.length > 0
  });

  // Debug logging for enriched orders changes
  useEffect(() => {
    printLog(`📱 Mobile: Enriched orders updated, count: ${enrichedOrders.length}`);
    enrichedOrders.forEach(order => {
      printLog(`📱 Mobile: Enriched order ${order.id} status: ${order.status}`);
    });
  }, [enrichedOrders]);

  useEffect(() => {
    if (session_id) {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [session_id]);

  // Gestisce l'apertura automatica del bottom sheet quando si arriva da una notifica
  useEffect(() => {
    if (openOrderId && enrichedOrders.length > 0) {
      const orderToOpen = enrichedOrders.find(order => order.id === openOrderId);
      if (orderToOpen) {
        printLog(`📱 Opening order from notification: ${openOrderId}`);
        setSelectedOrder(orderToOpen);
        setOrderSelectionTimestamp(Date.now());
        
        // Piccolo delay per assicurarsi che il bottom sheet sia pronto
        setTimeout(() => {
          bottomSheetRef.current?.present();
        }, 100);
      }
    }
  }, [openOrderId, enrichedOrders]);

  // Send email for orders that don't have email sent yet (MOBILE ONLY)
  useEffect(() => {
    const sendEmailForMobile = async () => {
      if (os !== 'web' && enrichedOrders.length > 0 && session?.user?.id) {
        printLog(`📧 Mobile: Checking ${enrichedOrders.length} orders for email status...`);
        
        // Use the centralized email manager
        await purchaseEmailManager.sendEmailForMostRecentOrder(enrichedOrders);
      }
    };

    sendEmailForMobile();
  }, [enrichedOrders.length, session?.user?.id, os, purchaseEmailManager]); // Added purchaseEmailManager dependency

  const handleOrderDeleted = (orderId: string) => {
    removeOrder(orderId);
    printLog(`Ordine ${orderId} eliminato`);
  };

  const handleOrderStatusUpdated = (orderId: string, newStatus: OrderProps['status']) => {
    updateOrder(orderId, { status: newStatus });
    printLog(`Ordine ${orderId} aggiornato con status: ${newStatus}`);
  };

  const handleShowOrderDetails = (order: OrderProps) => {
    setSelectedOrder(order);
    setOrderSelectionTimestamp(Date.now());
  };

  const handleRefundOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setOrderToRefund(order);
      setShowRefundConfirmation(true);
    }
  };

  const confirmRefund = async () => {
    if (!orderToRefund) return;
    
    try {
      await processRefund(orderToRefund.id, session?.user?.id, false);
      handleOrderStatusUpdated(orderToRefund.id, 'cancelled');
      printLog('Order refunded successfully');
    } catch (error) {
      printLog(`Error refunding order: ${error}`, true);
      // TODO: Show error message to user
    } finally {
      setShowRefundConfirmation(false);
      setOrderToRefund(null);
    }
  };

  if (loading) {
    return <Loader size="fullscreen" text="Caricamento ordini..." />;
  }


  if (os === "web") {
    return (
      <PrivateLayout title="I tuoi ordini | Pizzaurum" description="I tuoi ordini">
        <section className="max-w-7xl mx-auto w-full px-4 py-8">
          <PageHeader title="I tuoi ordini" description="Gestisci tutti i tuoi ordini" />
          <Separator className="my-2" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {orders.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Non hai ancora effettuato nessun ordine
              </div>
            ) : (
              enrichedOrders.map((order: OrderProps) => (
                <WebOrder 
                  key={order.id} 
                  order={order} 
                  isAdmin={false}
                  currentUserId={session?.user?.id}
                  onOrderStatusUpdated={handleOrderStatusUpdated}
                  onOrderDeleted={handleOrderDeleted}
                  onRefundOrder={handleRefundOrder}
                  showReport={false}
                />
              ))
            )}
          </div>
        </section>
        
        {/* Refund Confirmation Dialog for Web */}
        <ConfirmationDialog
          isOpen={showRefundConfirmation}
          onClose={() => {
            setShowRefundConfirmation(false);
            setOrderToRefund(null);
          }}
          onConfirm={confirmRefund}
          title="Conferma Rimborso"
          message={orderToRefund ? `Sei sicuro di voler rimborsare l'ordine #${orderToRefund.id.slice(0, 8)}? Questa azione processerà il rimborso di €${orderToRefund.price?.toFixed(2)} tramite Stripe e non può essere annullata.` : ''}
          confirmText="Rimborsa"
          cancelText="Annulla"
          variant="danger"
        />
      </PrivateLayout>
    )
  }

  return (
    <SafeAreaView className="flex-1 mb-16 ">
      <MobileHeader title="I tuoi ordini" icon="list-outline" />

      <LocalNotificationTest />
      
      <ScrollView className="pt-6">
        {orders.length === 0 ? (
          <View className="flex-1 justify-center items-center p-8">
            <CircleQuestionMark size={48} color="#9ca3af" />
            <Text className="text-gray-500 text-lg font-medium mt-4 mb-2">
              Nessun ordine trovato
            </Text>
            <Text className="text-gray-400 text-center">
              Non hai ancora effettuato nessun ordine
            </Text>
          </View>
        ) : (
          enrichedOrders.map((order: OrderProps) => (
            <MobileOrder 
              key={order.id} 
              order={order} 
              isAdmin={false}
              currentUserId={session?.user?.id}
              onOrderStatusUpdated={handleOrderStatusUpdated}
              onOrderDeleted={handleOrderDeleted}
              onShowDetails={handleShowOrderDetails}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom Sheet for Order Details */}
      <BottomSheetOrder
        ref={bottomSheetRef}
        isAdmin={false}
        order={selectedOrder ? enrichedOrders.find(o => o.id === selectedOrder.id) || selectedOrder : null}
        onOrderStatusUpdated={handleOrderStatusUpdated}
        onOrderDeleted={handleOrderDeleted}
        orderSelectionTimestamp={orderSelectionTimestamp}
      />

      {/* Refund Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRefundConfirmation}
        onClose={() => {
          setShowRefundConfirmation(false);
          setOrderToRefund(null);
        }}
        onConfirm={confirmRefund}
        title="Conferma Rimborso"
        message={orderToRefund ? `Sei sicuro di voler rimborsare l'ordine #${orderToRefund.id.slice(0, 8)}? Questa azione processerà il rimborso di €${orderToRefund.price?.toFixed(2)} tramite Stripe e non può essere annullata.` : ''}
        confirmText="Rimborsa"
        cancelText="Annulla"
        variant="danger"
      />
    </SafeAreaView>
  )
}

export default OrdersPage