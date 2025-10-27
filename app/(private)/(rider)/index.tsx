import MobileHeader from '@/components/(private)/(admin)/mobile-header';
import { OrderCard } from '@/components/(private)/(rider)/order-card';
import { OrderDetailsModal } from '@/components/(private)/(rider)/order-details-modal';
import PrivateLayout from '@/components/(private)/private-layout';
import Button from '@/components/ui/button';
import { useRiderOrders } from '@/hooks/useRiderOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { OrderProps } from '@/types/types';
import { MaterialIcons } from '@expo/vector-icons';
import { AlertCircle, Clock, Truck } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RiderIndex = () => {
  const { profile } = useUserProfile();
  const [selectedOrder, setSelectedOrder] = useState<OrderProps | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    availableOrders,
    assignedOrders,
    loading,
    isConnected,
    assignOrderToRider,
    completeOrder,
    refetch
  } = useRiderOrders({
    riderId: profile?.id,
    enabled: !!profile?.id,
    onError: (error) => {
      console.error('Rider orders error:', error);
    }
  });

  const isWeb = Platform.OS === 'web';

  const handleAssignOrder = useCallback(async (orderId: string) => {
    try {
      const result = await assignOrderToRider(orderId);
      if (result.success) {
        if (isWeb) {
          alert('Ordine assegnato con successo!');
        } else {
          Alert.alert('Successo', 'Ordine assegnato con successo!');
        }
      } else {
        if (isWeb) {
          alert('Errore nell\'assegnazione dell\'ordine');
        } else {
          Alert.alert('Errore', 'Errore nell\'assegnazione dell\'ordine');
        }
      }
    } catch (error) {
      console.error('Error assigning order:', error);
      if (isWeb) {
        alert('Errore nell\'assegnazione dell\'ordine');
      } else {
        Alert.alert('Errore', 'Errore nell\'assegnazione dell\'ordine');
      }
    }
  }, [assignOrderToRider, isWeb]);

  const handleCompleteOrder = useCallback(async (orderId: string) => {
    try {
      const result = await completeOrder(orderId);
      if (result.success) {
        if (isWeb) {
          alert('Ordine completato con successo!');
        } else {
          Alert.alert('Successo', 'Ordine completato con successo!');
        }
      } else {
        if (isWeb) {
          alert('Errore nel completamento dell\'ordine');
        } else {
          Alert.alert('Errore', 'Errore nel completamento dell\'ordine');
        }
      }
    } catch (error) {
      console.error('Error completing order:', error);
      if (isWeb) {
        alert('Errore nel completamento dell\'ordine');
      } else {
        Alert.alert('Errore', 'Errore nel completamento dell\'ordine');
      }
    }
  }, [completeOrder, isWeb]);

  const handleViewDetails = useCallback((order: OrderProps) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Caricamento ordini...</Text>
      </View>
    );
  }

  if (isWeb) {
    return (
      <PrivateLayout title="Ordini Disponibili | Pizzaurum" description="Ordini Disponibili">
        <section className="max-w-7xl mx-auto py-8 px-4 w-full">
          <div>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Ordini Disponibili
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Connesso' : 'Disconnesso'}
                  </span>
                </div>
                <Button onPress={() => handleRefresh()} variant="outline" text="Aggiorna" />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <Truck className="w-8 h-8 text-blue-600" />
                  <div className="flex items-end justify-center gap-1">
                    <Text className="text-2xl font-bold text-blue-600">
                      {availableOrders.length}
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Da Prendere
                    </Text>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                  <div className="flex items-end justify-center gap-1">
                    <Text className="text-2xl font-bold text-orange-600">
                      {assignedOrders.length}
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Presi in Carico
                    </Text>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-600" />
                  <div className="flex items-end justify-center gap-1">
                    <Text className="text-2xl font-bold text-green-600">
                      {availableOrders.filter(o => o.status === 'ready_to_pickup').length}
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Pronti per Ritiro
                    </Text>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders List */}
            {availableOrders.length === 0 && assignedOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessun ordine disponibile
                </h3>
                <p className="text-gray-600">
                  Al momento non ci sono ordini da consegnare. Controlla più tardi!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Ordini Presi in Carico */}
                {assignedOrders.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      Ordini Presi in Carico ({assignedOrders.length})
                    </h2>
                    <div className="space-y-4">
                      {assignedOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          type="assigned"
                          onComplete={handleCompleteOrder}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Ordini da Prendere in Carico */}
                {availableOrders.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-600" />
                      Ordini da Prendere in Carico ({availableOrders.length})
                    </h2>
                    <div className="space-y-4">
                      {availableOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          type="available"
                          onAssign={handleAssignOrder}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <OrderDetailsModal
            order={selectedOrder}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAssign={handleAssignOrder}
            onComplete={handleCompleteOrder}
            type={selectedOrder?.driver_id === profile?.id ? "assigned" : "available"}
          />
        </section>
      </PrivateLayout>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <MobileHeader 
        title="Ordini Disponibili" 
        icon={<MaterialIcons name="delivery-dining" size={20} color="white" />} 
      />
      <ScrollView
        className="flex-1 bg-white"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Ordini Disponibili
            </Text>
            <View className="flex-row items-center gap-2">
              <View className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className="text-sm text-gray-600">
                {isConnected ? 'Connesso' : 'Disconnesso'}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row gap-4 mb-6">
            <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
              <View className="flex-row items-center gap-3">
                <Truck className="w-6 h-6 text-blue-600" />
                <View>
                  <Text className="text-xl font-bold text-blue-600">
                    {availableOrders.length}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    Da Prendere
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
              <View className="flex-row items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <View>
                  <Text className="text-xl font-bold text-orange-600">
                    {assignedOrders.length}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    Presi in Carico
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Orders List */}
          {availableOrders.length === 0 && assignedOrders.length === 0 ? (
            <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 items-center">
              <Truck className="w-12 h-12 text-gray-400 mb-4" />
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Nessun ordine disponibile
              </Text>
              <Text className="text-gray-600 text-center">
                Al momento non ci sono ordini da consegnare. Controlla più tardi!
              </Text>
            </View>
          ) : (
            <View className="space-y-6">
              {/* Ordini Presi in Carico */}
              {assignedOrders.length > 0 && (
                <View>
                  <View className="flex-row items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <Text className="text-lg font-semibold text-gray-900">
                      Ordini Presi in Carico ({assignedOrders.length})
                    </Text>
                  </View>
                  <View className="space-y-4">
                    {assignedOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        type="assigned"
                        onComplete={handleCompleteOrder}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Ordini da Prendere in Carico */}
              {availableOrders.length > 0 && (
                <View>
                  <View className="flex-row items-center gap-2 mb-4">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <Text className="text-lg font-semibold text-gray-900">
                      Ordini da Prendere in Carico ({availableOrders.length})
                    </Text>
                  </View>
                  <View className="space-y-4">
                    {availableOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        type="available"
                        onAssign={handleAssignOrder}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssign={handleAssignOrder}
        onComplete={handleCompleteOrder}
        type={selectedOrder?.driver_id === profile?.id ? "assigned" : "available"}
      />
    </SafeAreaView>
  );
};

export default RiderIndex;