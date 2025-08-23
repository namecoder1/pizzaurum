"use client"

import MobileHeader from "@/components/(private)/(admin)/mobile-header";
import MobileReportForm from "@/components/(private)/(admin)/mobile-report-form";
import RealtimeDebugPanel from "@/components/(private)/(admin)/realtime-debug-panel";
import WebReportForm from "@/components/(private)/(admin)/web-report-form";
import BottomSheetOrder, { BottomSheetOrderRef } from "@/components/(private)/(customer)/bottomsheet-order";
import MobileOrder from "@/components/(private)/mobile-order";
import PageHeader from "@/components/(private)/page-header";
import PrivateLayout from "@/components/(private)/private-layout";
import WebOrder from "@/components/(private)/web-order";

import Button from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/Loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminOrdersWithRealtime } from "@/hooks/useAdminOrdersWithRealtime";
import { useOrderProductsEnrichmentForOrders } from '@/hooks/useOrderProductsEnrichment';
import { processRefund } from "@/lib/orders-actions";
import { OrderProps } from "@/types/types";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminOrders() {
  const os = Platform.OS;
  const [activeTab, setActiveTab] = React.useState<string>('all');
  const [activeSelect, setActiveSelect] = React.useState<any>('all');
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderProps | null>(null);
  const [searchWord, setSearchWord] = useState<string>('');
  const [showRefundConfirmation, setShowRefundConfirmation] = useState(false);
  const [orderToRefund, setOrderToRefund] = useState<OrderProps | null>(null);
  const bottomSheetRef = useRef<BottomSheetOrderRef>(null);

  // Usa il nuovo hook per gli ordini admin con real-time
  const { 
    orders, 
    loading,
    updateOrder,
    removeOrder 
  } = useAdminOrdersWithRealtime({
    enabled: true,
    onOrderInsert: (newOrder: OrderProps) => {
      // Mostra notifica per nuovo ordine
      if (os === "web") {
        // Per web, potresti usare una notifica del browser
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Nuovo Ordine!', {
            body: `Ordine #${newOrder.id.slice(0, 8)} ricevuto`,
            icon: '/favicon.ico'
          });
        }
      }
    },
    onOrderUpdate: (updatedOrder: OrderProps) => {
    },
    onOrderDelete: (orderId: string) => {
    },
    onError: (error: any) => {
    }
  });

  // Enrich products for all orders while preserving order structure
  const { enrichedOrders, isEnriching: isEnrichingProducts } = useOrderProductsEnrichmentForOrders({
    orders: orders,
    enabled: orders.length > 0
  });



  // Filtra gli ordini in base al tab attivo e alla ricerca
  const filteredOrders = useMemo(() => {
    let filtered = enrichedOrders.filter((order: OrderProps) => {
      // Prima filtra per status se non è 'all'
      if (activeTab !== 'all') {
        if (activeTab === 'pending') return order.status === 'pending';
        if (activeTab === 'accepted') return order.status === 'accepted';
        if (activeTab === 'in_preparation') return order.status === 'in_preparation';
        if (activeTab === 'ready_to_pickup') return order.status === 'ready_to_pickup';
        if (activeTab === 'delivering') return order.status === 'delivering';
        if (activeTab === 'delivered') return order.status === 'delivered';
        if (activeTab === 'completed') return order.status === 'completed';
        return false;
      }
      return true;
    });

    // Poi filtra per ricerca se c'è una parola di ricerca
    if (searchWord.trim()) {
      const searchTerm = searchWord.toLowerCase().trim();
      filtered = filtered.filter((order: OrderProps) => {
        // Cerca nell'ID dell'ordine
        if (order.id.toLowerCase().includes(searchTerm)) return true;
        
        // Cerca nei nomi dei prodotti
        if (order.products && order.products.some(product => 
          product.name.toLowerCase().includes(searchTerm)
        )) return true;
        
        // Cerca negli extra dei prodotti
        if (order.products && order.products.some(product => 
          product.extras && product.extras.some(extra => 
            extra.name.toLowerCase().includes(searchTerm)
          )
        )) return true;
        
        // Cerca nel payment_issuer
        if (order.payment_issuer && order.payment_issuer.toLowerCase().includes(searchTerm)) return true;
        
        return false;
      });
    }
    
    return filtered;
  }, [enrichedOrders, activeTab, searchWord]);

  const handleOrderDeleted = useCallback((orderId: string) => {
    removeOrder(orderId);
  }, [removeOrder]);

  const handleOrderStatusUpdated = useCallback((orderId: string, newStatus: OrderProps['status']) => {
    updateOrder(orderId, { status: newStatus });
  }, [updateOrder]);

  const handleTabValueChange = useCallback((value: string) => {
    setActiveTab(value);
    setActiveSelect(value);
  }, []);

  const handleSelectValueChange = useCallback((option: any) => {
    const value = option?.value || option;
    setActiveSelect(value);
    setActiveTab(value);
  }, []);

  const handleReportOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setReportFormOpen(true);
  }, []);

  const handleRefundOrder = useCallback((orderId: string) => {
    const order = enrichedOrders.find(o => o.id === orderId);
    if (order) {
      setOrderToRefund(order);
      setShowRefundConfirmation(true);
    }
  }, [enrichedOrders]);

  const confirmRefund = async () => {
    if (!orderToRefund) return;
    
    try {
      await processRefund(orderToRefund.id, undefined, true); // Admin refund
      handleOrderStatusUpdated(orderToRefund.id, 'cancelled');
    } catch (error) {
      console.error('Error refunding order:', error);
      // TODO: Show error message to user
    } finally {
      setShowRefundConfirmation(false);
      setOrderToRefund(null);
    }
  };

  const handleShowOrderDetails = useCallback((order: OrderProps) => {
    setSelectedOrder(order);
    bottomSheetRef.current?.present();
  }, []);

  if (loading || isEnrichingProducts) return <Loader size="fullscreen" text="Caricamento ordini..." />;

  if (os === 'web') {
    return (
      <PrivateLayout title="Gestione Ordini attivi | Pizzaurum" description="Gestione Ordini">
        <section className="max-w-7xl mx-auto w-full px-4 py-8">
          <PageHeader title="Gestione Ordini" description="Gestisci tutti gli ordini attivi nella piattaforma" showChildren>
            <div className="flex items-center gap-2">
              {activeTab !== 'all' && (            
                <button
                  className="bg-white text-red-500 text-sm mr-2 hover:underline underline-offset-2 hidden lg:block"
                  onClick={() => {
                    setActiveTab('all');
                    setActiveSelect('all');
                  }}
                >
                  Resetta filtri
                </button>
              )}
            </div>
          </PageHeader>

          <Separator className="my-4" />

          <div className="flex flex-row items-center gap-2 mb-2">
            <div className="relative w-full">

              <Input
                placeholder="Cerca per ID ordine, prodotti, extra..."
                value={searchWord}
                onChangeText={setSearchWord}
                className="w-full pr-10"
              />
            </div>
            {searchWord && (
              <Button
                text="Pulisci"
                onPress={() => setSearchWord('')}
                variant="destructive"
                className="shrink-0"
              />
            )}
          </div>


          <Tabs value={activeTab} onValueChange={handleTabValueChange} className="flex-1 w-full hidden lg:block">
            <TabsList className="w-full hidden lg:flex lg:flex-row mb-4">
              <TabsTrigger className="flex-1" value='pending'><Text>In attesa</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='accepted'><Text>Accettato</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='in_preparation'><Text>In preparazione</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='ready_to_pickup'><Text>Pronto per ritiro</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='delivering'><Text>In consegna</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='delivered'><Text>Consegnato</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='completed'><Text>Completato</Text></TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Nessun ordine trovato per questo stato
                </div>
              ) : (
                filteredOrders.map((order: OrderProps) => (
                  <WebOrder
                    key={order.id}
                    order={order}
                    isAdmin={true}
                    currentUserId={undefined} // Admin non ha bisogno del currentUserId per i controlli
                    onOrderDeleted={handleOrderDeleted}
                    onOrderStatusUpdated={handleOrderStatusUpdated}
                    onReportOrder={handleReportOrder}
                    onRefundOrder={handleRefundOrder}
                    showReport={true}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>

                
          <div className="flex gap-x-2 lg:hidden">
            <Select value={activeSelect} onValueChange={handleSelectValueChange} className="flex-1">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Tutti" />
                <SelectItem value="pending" label="In attesa" />
                <SelectItem value="accepted" label="Accettato" />
                <SelectItem value="in_preparation" label="In preparazione" />
                <SelectItem value="ready_to_pickup" label="Pronto per ritiro" />
                <SelectItem value="delivering" label="In consegna" />
                <SelectItem value="delivered" label="Consegnato" />
                <SelectItem value="completed" label="Completato" />
              </SelectContent>
            </Select>
            <Button 
              text='Resetta filtri'
              onPress={() => {
                setActiveTab('all');
                setActiveSelect('all');
              }}
              variant="destructive"
              className="shrink-0"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:hidden mt-4">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Nessun ordine trovato per questo stato
              </div>
            ) : (
              filteredOrders.map((order: OrderProps) => (
                <WebOrder 
                  key={order.id} 
                  order={order} 
                  isAdmin={true} 
                  currentUserId={undefined} // Admin non ha bisogno del currentUserId per i controlli
                  onOrderDeleted={handleOrderDeleted}
                  onOrderStatusUpdated={handleOrderStatusUpdated}
                  onReportOrder={handleReportOrder}
                  onRefundOrder={handleRefundOrder}
                  showReport={true}
                />
              ))
            )}
          </div>

          {/* WebReportForm per la pagina admin */}
          {reportFormOpen && (
            <WebReportForm 
              open={reportFormOpen} 
              setOpen={setReportFormOpen} 
              orderId={selectedOrderId} 
            />
          )}

          {/* Test Panel */}
          <RealtimeDebugPanel 
            isOpen={showTestPanel} 
            onClose={() => setShowTestPanel(false)} 
          />

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
    <SafeAreaView className="flex-1 bg-gray-100 mb-16">
      <MobileHeader title="Ordini" icon="list-outline" />
      <ScrollView className="flex-1  py-4">

        {/* Mobile Search Bar */}
        <View className="px-4 mb-4">
          <View className="relative">
            <Text className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</Text>
            <Input
              placeholder="Cerca ordini..."
              value={searchWord}
              onChangeText={setSearchWord}
              className="pl-4 pr-10"
            />
            {searchWord && (
              <Button
                text="✕"
                onPress={() => setSearchWord('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent p-0 min-h-0"
                variant="link"
              />
            )}
          </View>
        </View>

        <View className="flex flex-row gap-x-2 lg:hidden px-4 mb-4">
          <Select value={activeSelect} onValueChange={handleSelectValueChange} className="flex-1">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtra per stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="Tutti" />
              <SelectItem value="pending" label="In attesa" />
              <SelectItem value="accepted" label="Accettato" />
              <SelectItem value="in_preparation" label="In preparazione" />
              <SelectItem value="ready_to_pickup" label="Pronto per ritiro" />
              <SelectItem value="delivering" label="In consegna" />
              <SelectItem value="delivered" label="Consegnato" />
              <SelectItem value="completed" label="Completato" />
            </SelectContent>
          </Select>
          <Button 
            text='Resetta filtri'
            onPress={() => {
              setActiveTab('all');
              setActiveSelect('all');
            }}
            variant="destructive"
            className="shrink-0"
          />
        </View>

        {filteredOrders.length === 0 ? (
          <View className="flex-1 justify-center items-center p-8">
            <Text className="text-gray-500 text-lg font-medium mt-4 mb-2">
              Nessun ordine trovato
            </Text>
            <Text className="text-gray-400 text-center">
              Nessun ordine trovato per questo stato
            </Text>
          </View>
        ) : (
          filteredOrders.map((order: OrderProps) => (
            <MobileOrder 
              key={order.id} 
              order={order} 
              isAdmin={true}
              currentUserId={undefined} // Admin non ha bisogno del currentUserId per i controlli
              onOrderStatusUpdated={handleOrderStatusUpdated}
              onOrderDeleted={handleOrderDeleted}
              onShowDetails={handleShowOrderDetails}
              onReportOrder={handleReportOrder}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom Sheet for Order Details */}
      <BottomSheetOrder
        isAdmin={true}
        ref={bottomSheetRef}
        order={selectedOrder ? enrichedOrders.find(o => o.id === selectedOrder.id) || selectedOrder : null}
        onOrderStatusUpdated={handleOrderStatusUpdated}
        onOrderDeleted={handleOrderDeleted}
        onOrderUpdate={(orderId, updates) => updateOrder(orderId, updates)}
      />
      {reportFormOpen && (
        <MobileReportForm 
          open={reportFormOpen}
          setOpen={setReportFormOpen}
          orderId={selectedOrderId} 
        />
      )}

      {/* Refund Confirmation Dialog for Mobile */}
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
  );
}
