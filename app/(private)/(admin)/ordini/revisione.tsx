import WebReportForm from '@/components/(private)/(admin)/web-report-form';
import PageHeader from '@/components/(private)/page-header';
import PrivateLayout from '@/components/(private)/private-layout';
import WebOrder from '@/components/(private)/web-order';
import Button from '@/components/ui/button';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import Loader from '@/components/ui/Loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { processRefund } from '@/lib/orders-actions';
import { createClientSupabase } from '@/lib/supabase';
import { printLog } from '@/lib/utils';
import { OrderProps } from '@/types/types';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OrderReviewingPage = () => {
  const os = Platform.OS
  const [orders, setOrders] = React.useState<OrderProps[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<any>('all');
  const [activeSelect, setActiveSelect] = React.useState<any>('all');
  const [reportFormOpen, setReportFormOpen] = React.useState(false);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>('');
  const [showRefundConfirmation, setShowRefundConfirmation] = React.useState(false);
  const [orderToRefund, setOrderToRefund] = React.useState<OrderProps | null>(null);

  const handleReportOrder = React.useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setReportFormOpen(true);
  }, []);

  const handleRefundOrder = React.useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setOrderToRefund(order);
      setShowRefundConfirmation(true);
    }
  }, [orders]);

  const confirmRefund = async () => {
    if (!orderToRefund) return;
    
    try {
      await processRefund(orderToRefund.id, undefined, true); // Admin refund
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderToRefund.id 
            ? { ...order, status: 'cancelled' as const } 
            : order
        )
      );
      printLog('Order refunded successfully');
    } catch (error) {
      printLog(`Error refunding order: ${error}`, true);
      // TODO: Show error message to user
    } finally {
      setShowRefundConfirmation(false);
      setOrderToRefund(null);
    }
  };

  React.useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const supabase = await createClientSupabase();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        printLog(`Error fetching orders: ${error}`, true); 
      } else {
        setOrders(data as unknown as OrderProps[]);
      }
      setLoading(false);
    }

    fetchOrders();
  }, [])

  const handleOrderDeleted = (orderId: string) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
  };

  const handleOrderStatusUpdated = (orderId: string, newStatus: OrderProps['status']) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      )
    );
  };

  const handleTabValueChange = (value: string) => {
    setActiveTab(value);
    setActiveSelect(value);
  }

  const handleSelectValueChange = (option: any) => {
    const value = option?.value || option;
    setActiveSelect(value);
    setActiveTab(value);
  }

  const allOrders = orders.filter((order) => {
    return order.status === 'cancelled' || order.status === 'reopened' || order.status === 'reported';
  });


  if (loading) return <Loader size="fullscreen" text="Caricamento ordini in revisione..." />;


  if (os === 'web') {
    return (
      <PrivateLayout title="Gestione Ordini in revisione | Pizzaurum" description="Gestione Ordini in revisione">
        <section className='max-w-7xl mx-auto w-full px-4 py-8'>
          <PageHeader title="Gestione Ordini in revisione" description="Gestisci tutti gli ordini in revisione nella piattaforma" showChildren={true}>
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
          </PageHeader>

          <Separator className="my-4" />

          <Tabs value={activeTab} onValueChange={handleTabValueChange} className="flex-1 w-full hidden lg:block">
            <TabsList className="w-full hidden lg:flex lg:flex-row mb-4">
              <TabsTrigger className="flex-1" value='all'><Text>Tutti</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='cancelled'><Text>Annullato</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='reopened'><Text>Riaperto</Text></TabsTrigger>
              <TabsTrigger className="flex-1" value='reported'><Text>Segnalato</Text></TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === 'all' ? allOrders : orders.filter((order) => {
                if (activeTab === 'cancelled') return order.status === 'cancelled';
                if (activeTab === 'reopened') return order.status === 'reopened';
                if (activeTab === 'reported') return order.status === 'reported';
                return false;
              })).map((order) => (
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
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex gap-x-2 lg:hidden">
            <Select value={activeSelect} onValueChange={handleSelectValueChange} className="flex-1">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Tutti" />
                <SelectItem value="cancelled" label="Annullato" />
                <SelectItem value="reopened" label="Riaperto" />
                <SelectItem value="reported" label="Segnalato" />
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
            {activeTab === 'all' ? allOrders.map((order) => (
              <WebOrder 
                key={order.id} 
                order={order} 
                isAdmin={true} 
                currentUserId={undefined} // Admin non ha bisogno del currentUserId per i controlli
                onOrderDeleted={handleOrderDeleted}
                onOrderStatusUpdated={handleOrderStatusUpdated}
                onReportOrder={handleReportOrder}
                onRefundOrder={handleRefundOrder}
              />
            )) : allOrders.filter((order) => {
              if (activeTab === 'cancelled') return order.status === 'cancelled';
              if (activeTab === 'reopened') return order.status === 'reopened';
              if (activeTab === 'reported') return order.status === 'reported';
              return false;
            }).map((order) => (
              <WebOrder 
                key={order.id} 
                order={order} 
                isAdmin={true} 
                currentUserId={undefined} // Admin non ha bisogno del currentUserId per i controlli
                onOrderDeleted={handleOrderDeleted}
                onOrderStatusUpdated={handleOrderStatusUpdated}
                onReportOrder={handleReportOrder}
                onRefundOrder={handleRefundOrder}
              />
            ))}
          </div>
          
          {/* WebReportForm per la pagina revisione */}
          {reportFormOpen && (
            <WebReportForm 
              open={reportFormOpen} 
              setOpen={setReportFormOpen} 
              orderId={selectedOrderId} 
            />
          )}

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
        </section>
      </PrivateLayout>
    )
  }

  return (
    <SafeAreaView className='flex-1'>
      <View className="flex-1 bg-gray-50">
        <View className="flex-1 bg-white">
          <Text>ciao</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default OrderReviewingPage