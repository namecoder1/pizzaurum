import MobileHeader from '@/components/(private)/(admin)/mobile-header';
import { OrderCard } from '@/components/(private)/(rider)/order-card';
import { OrderDetailsModal } from '@/components/(private)/(rider)/order-details-modal';
import PageHeader from '@/components/(private)/page-header';
import PrivateLayout from '@/components/(private)/private-layout';
import { useRiderOrders } from '@/hooks/useRiderOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { OrderProps } from '@/types/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar, CheckCircle2, DollarSign, Truck } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CompletedOrders = () => {
  const { profile } = useUserProfile();
  const [selectedOrder, setSelectedOrder] = useState<OrderProps | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const {
    completedOrders,
    loading,
    isConnected,
    refetch
  } = useRiderOrders({
    riderId: profile?.id,
    enabled: !!profile?.id,
    onError: (error) => {
      console.error('Rider orders error:', error);
    }
  });

  const isWeb = Platform.OS === 'web';

  const handleViewDetails = useCallback((order: OrderProps) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtra ordini per periodo
  const filteredOrders = useMemo(() => {
    if (selectedPeriod === 'all') {
      return completedOrders;
    }

    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(now);
        startDate.setDate(now.getDate() + mondayOffset);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return completedOrders;
    }

    return completedOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate;
    });
  }, [completedOrders, selectedPeriod]);

  // Calcola statistiche
  const stats = useMemo(() => {
    const totalDeliveries = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.price, 0);
    
    // Calcolo guadagno del rider: 2€ per consegna + 5% del valore dell'ordine
    const basePayPerDelivery = 2;
    const commissionRate = 0.05;
    
    const totalEarnings = filteredOrders.reduce((sum, order) => {
      return sum + basePayPerDelivery + (order.price * commissionRate);
    }, 0);

    const avgOrderValue = totalDeliveries > 0 ? totalRevenue / totalDeliveries : 0;

    return {
      totalDeliveries,
      totalRevenue,
      totalEarnings,
      avgOrderValue
    };
  }, [filteredOrders]);

  const getPeriodText = () => {
    switch (selectedPeriod) {
      case 'today':
        return 'Oggi';
      case 'week':
        return 'Questa Settimana';
      case 'month':
        return 'Questo Mese';
      case 'all':
        return 'Tutti i Tempi';
    }
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
      <PrivateLayout title="Ordini Completati | Pizzaurum" description="Ordini Completati">
        <section className="max-w-7xl mx-auto w-full px-4 py-8">
          <PageHeader title="Ordini Completati" description="Gestisci tutti gli ordini completati" showChildren={true} />

          {/* Header */}
          

          {/* Period Filter */}
          <div className="mb-6">
            <div className="flex gap-2">
              {(['today', 'week', 'month', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {period === 'today' && 'Oggi'}
                  {period === 'week' && 'Settimana'}
                  {period === 'month' && 'Mese'}
                  {period === 'all' && 'Tutto'}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <Text className="text-2xl font-bold text-green-600">
                    {stats.totalDeliveries}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Consegne {getPeriodText()}
                  </Text>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <div>
                  <Text className="text-2xl font-bold text-blue-600">
                    {formatPrice(stats.totalEarnings)}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Guadagno {getPeriodText()}
                  </Text>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Truck className="w-8 h-8 text-purple-600" />
                <div>
                  <Text className="text-2xl font-bold text-purple-600">
                    {formatPrice(stats.totalRevenue)}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Valore Ordini
                  </Text>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-orange-600" />
                <div>
                  <Text className="text-2xl font-bold text-orange-600">
                    {formatPrice(stats.avgOrderValue)}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Media per Ordine
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessun ordine completato
              </h3>
              <p className="text-gray-600">
                Non hai ancora completato ordini {selectedPeriod !== 'all' ? `${getPeriodText().toLowerCase()}` : ''}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type="completed"
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </section>

        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          type="completed"
        />
      </PrivateLayout>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <MobileHeader
        title="Ordini Completati"
        icon={<MaterialCommunityIcons name="clipboard-check-multiple-outline" size={20} color="white" />}
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
              Ordini Completati
            </Text>
            <View className="flex-row items-center gap-2">
              <View className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className="text-sm text-gray-600">
                {isConnected ? 'Connesso' : 'Disconnesso'}
              </Text>
            </View>
          </View>

          {/* Period Filter */}
          <View className="mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(['today', 'week', 'month', 'all'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setSelectedPeriod(period)}
                    className={`px-4 py-2 rounded-lg ${
                      selectedPeriod === period
                        ? 'bg-blue-600'
                        : 'bg-white border border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedPeriod === period
                        ? 'text-white'
                        : 'text-gray-700'
                    }`}>
                      {period === 'today' && 'Oggi'}
                      {period === 'week' && 'Settimana'}
                      {period === 'month' && 'Mese'}
                      {period === 'all' && 'Tutto'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Stats */}
          <View className="space-y-4 mb-6">
            <View className="flex-row gap-4">
              <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
                <View className="flex-row items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <View>
                    <Text className="text-xl font-bold text-green-600">
                      {stats.totalDeliveries}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      Consegne
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
                <View className="flex-row items-center gap-3">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                  <View>
                    <Text className="text-xl font-bold text-blue-600">
                      {formatPrice(stats.totalEarnings)}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      Guadagno
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
                <View className="flex-row items-center gap-3">
                  <Truck className="w-6 h-6 text-purple-600" />
                  <View>
                    <Text className="text-xl font-bold text-purple-600">
                      {formatPrice(stats.totalRevenue)}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      Valore Ordini
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
                <View className="flex-row items-center gap-3">
                  <Calendar className="w-6 h-6 text-orange-600" />
                  <View>
                    <Text className="text-xl font-bold text-orange-600">
                      {formatPrice(stats.avgOrderValue)}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      Media
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 items-center">
              <CheckCircle2 className="w-12 h-12 text-gray-400 mb-4" />
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Nessun ordine completato
              </Text>
              <Text className="text-gray-600 text-center">
                Non hai ancora completato ordini {selectedPeriod !== 'all' ? `${getPeriodText().toLowerCase()}` : ''}.
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type="completed"
                  onViewDetails={handleViewDetails}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="completed"
      />
    </SafeAreaView>
  );
};

export default CompletedOrders;
