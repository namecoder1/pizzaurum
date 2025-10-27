import { OrderCard } from '@/components/(private)/(rider)/order-card';
import { OrderDetailsModal } from '@/components/(private)/(rider)/order-details-modal';
import { useRiderOrders } from '@/hooks/useRiderOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { CheckCircle2, Clock, AlertCircle as AlertCircle2 } from 'lucide-react-native';
import { OrderProps } from '@/types/types';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MobileHeader from '@/components/(private)/(admin)/mobile-header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PrivateLayout from '@/components/(private)/private-layout';
import PageHeader from '@/components/(private)/page-header';

const AssignedOrders = () => {
  const { profile } = useUserProfile();
  const [selectedOrder, setSelectedOrder] = useState<OrderProps | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    assignedOrders,
    loading,
    isConnected,
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

  // Raggruppa gli ordini per stato
  const deliveringOrders = assignedOrders.filter(order => order.status === 'delivering');
  const readyOrders = assignedOrders.filter(order => order.status === 'ready_to_pickup');
  const preparingOrders = assignedOrders.filter(order => 
    order.status === 'accepted' || order.status === 'in_preparation'
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Caricamento ordini...</Text>
      </View>
    );
  }

  if (isWeb) {
    return (
      <PrivateLayout title="I Miei Ordini | Pizzaurum" description="I Miei Ordini">
        <div className="max-w-7xl mx-auto w-full px-4 py-8">
          <PageHeader title="I Miei Ordini" description="Gestisci tutti gli ordini assegnati al momento" showChildren={true} />

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-600" />
                <div>
                  <Text className="text-2xl font-bold text-blue-600">
                    {assignedOrders.length}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Ordini Assegnati
                  </Text>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle2 className="w-8 h-8 text-orange-600" />
                <div>
                  <Text className="text-2xl font-bold text-orange-600">
                    {readyOrders.length}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Pronti per Ritiro
                  </Text>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <Text className="text-2xl font-bold text-green-600">
                    {deliveringOrders.length}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    In Consegna
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Orders by Status */}
          {assignedOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessun ordine assegnato
              </h3>
              <p className="text-gray-600">
                Non hai ordini assegnati al momento. Vai alla sezione "Ordini Disponibili" per prenderne uno!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* In Consegna */}
              {deliveringOrders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    In Consegna ({deliveringOrders.length})
                  </h2>
                  <div className="space-y-4">
                    {deliveringOrders.map((order) => (
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

              {/* Pronti per Ritiro */}
              {readyOrders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle2 className="w-5 h-5 text-orange-600" />
                    Pronti per Ritiro ({readyOrders.length})
                  </h2>
                  <div className="space-y-4">
                    {readyOrders.map((order) => (
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

              {/* In Preparazione */}
              {preparingOrders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    In Preparazione ({preparingOrders.length})
                  </h2>
                  <div className="space-y-4">
                    {preparingOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        type="assigned"
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
          onComplete={handleCompleteOrder}
          type="assigned"
        />
      </PrivateLayout>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <MobileHeader 
        title="Ordini Assegnati" 
        icon={<MaterialCommunityIcons name="clipboard-text-clock-outline" size={20} color="white" />} 
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
              I Miei Ordini
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
                <Clock className="w-6 h-6 text-blue-600" />
                <View>
                  <Text className="text-xl font-bold text-blue-600">
                    {assignedOrders.length}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    Assegnati
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
              <View className="flex-row items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <View>
                  <Text className="text-xl font-bold text-green-600">
                    {deliveringOrders.length}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    In Consegna
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Orders */}
          {assignedOrders.length === 0 ? (
            <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 items-center">
              <Clock className="w-12 h-12 text-gray-400 mb-4" />
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Nessun ordine assegnato
              </Text>
              <Text className="text-gray-600 text-center">
                Non hai ordini assegnati al momento. Vai alla sezione "Ordini Disponibili"!
              </Text>
            </View>
          ) : (
            <View className="space-y-6">
              {/* In Consegna */}
              {deliveringOrders.length > 0 && (
                <View>
                  <View className="flex-row items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <Text className="text-lg font-semibold text-gray-900">
                      In Consegna ({deliveringOrders.length})
                    </Text>
                  </View>
                  <View className="space-y-4">
                    {deliveringOrders.map((order) => (
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

              {/* Pronti per Ritiro */}
              {readyOrders.length > 0 && (
                <View>
                  <View className="flex-row items-center gap-2 mb-4">
                    <AlertCircle2 className="w-5 h-5 text-orange-600" />
                    <Text className="text-lg font-semibold text-gray-900">
                      Pronti per Ritiro ({readyOrders.length})
                    </Text>
                  </View>
                  <View className="space-y-4">
                    {readyOrders.map((order) => (
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

              {/* In Preparazione */}
              {preparingOrders.length > 0 && (
                <View>
                  <View className="flex-row items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <Text className="text-lg font-semibold text-gray-900">
                      In Preparazione ({preparingOrders.length})
                    </Text>
                  </View>
                  <View className="space-y-4">
                    {preparingOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        type="assigned"
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
        onComplete={handleCompleteOrder}
        type="assigned"
      />
    </SafeAreaView>
  );
};

export default AssignedOrders;
