import MobileHeader from '@/components/(private)/(admin)/mobile-header';
import { EarningsSummary } from '@/components/(private)/(rider)/earnings-summary';
import PageHeader from '@/components/(private)/page-header';
import PrivateLayout from '@/components/(private)/private-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRiderOrders } from '@/hooks/useRiderOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar, Clock, Info, TrendingUp } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EarningsPage = () => {
  const { profile } = useUserProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');

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

  // Calcola statistiche dettagliate per periodo
  const detailedStats = useMemo(() => {
    const periods = ['today', 'week', 'month'] as const;
    
    return periods.map(period => {
      const now = new Date();
      let startDate: Date;

      switch (period) {
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
      }

      const filteredOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate;
      });

      const totalDeliveries = filteredOrders.length;
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.price, 0);
      
      // Calcolo guadagno del rider: 2€ per consegna + 5% del valore dell'ordine
      const basePayPerDelivery = 2;
      const commissionRate = 0.05;
      
      const totalEarnings = filteredOrders.reduce((sum, order) => {
        return sum + basePayPerDelivery + (order.price * commissionRate);
      }, 0);

      // Stima ore lavorate (30 min per consegna)
      const estimatedHours = (totalDeliveries * 0.5);
      const hourlyRate = estimatedHours > 0 ? totalEarnings / estimatedHours : 0;

      return {
        period,
        totalDeliveries,
        totalRevenue,
        totalEarnings,
        estimatedHours,
        hourlyRate,
        orders: filteredOrders
      };
    });
  }, [completedOrders]);

  // Calcola trend settimanale (ultimi 7 giorni)
  const weeklyTrend = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    return last7Days.map(date => {
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= dayStart && orderDate < dayEnd;
      });

      const earnings = dayOrders.reduce((sum, order) => {
        return sum + 2 + (order.price * 0.05);
      }, 0);

      return {
        date: date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit' }),
        deliveries: dayOrders.length,
        earnings
      };
    });
  }, [completedOrders]);

  const getPeriodText = (period: 'today' | 'week' | 'month') => {
    switch (period) {
      case 'today':
        return 'Oggi';
      case 'week':
        return 'Questa Settimana';
      case 'month':
        return 'Questo Mese';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Caricamento dati...</Text>
      </View>
    );
  }

  if (isWeb) {
    return (
      <PrivateLayout title="Orari e Stipendio | Pizzaurum" description="Orari e Stipendio">
        <div className="max-w-7xl mx-auto w-full px-4 py-8">
          {/* Header */}
          <PageHeader title="Orari e Stipendio" description="Una panoramica dettagliata delle tue ore lavorate e del tuo stipendio" showChildren={true} />

          {/* Period Selector */}
          <div className="mb-6">
            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {getPeriodText(period)}
                </button>
              ))}
            </div>
          </div>

          {/* Earnings Summary */}
          <EarningsSummary 
            completedOrders={completedOrders} 
            period={selectedPeriod} 
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detailed Stats */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Riepilogo Periodi
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detailedStats.map((stat) => (
                    <div 
                      key={stat.period}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        stat.period === selectedPeriod
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Text className="font-semibold text-gray-900">
                          {getPeriodText(stat.period)}
                        </Text>
                        <Text className="text-lg font-bold text-green-600">
                          {formatPrice(stat.totalEarnings)}
                        </Text>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Text className="text-gray-600">Consegne</Text>
                          <Text className="font-semibold">{stat.totalDeliveries}</Text>
                        </div>
                        <div className="flex items-center gap-2">
                          <Text className="text-gray-600">Ore stimate</Text>
                          <Text className="font-semibold">{stat.estimatedHours.toFixed(1)}h</Text>
                        </div>
                        <div className="flex items-center gap-2">
                          <Text className="text-gray-600">€/Ora</Text>
                          <Text className="font-semibold">{formatPrice(stat.hourlyRate)}</Text>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trend */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Trend Ultimi 7 Giorni
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyTrend.map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Text className="font-medium text-gray-900 w-16">
                          {day.date}
                        </Text>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <Text className="text-sm text-gray-600">
                            {day.deliveries} consegne
                          </Text>
                        </div>
                      </div>
                      <Text className="font-semibold text-green-600">
                        {formatPrice(day.earnings)}
                      </Text>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Info */}
          <Card className="mt-6">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Come Funziona il Pagamento
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Struttura Pagamento</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>€2,00 fissi per ogni consegna completata</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>5% del valore totale dell'ordine come bonus</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Pagamento settimanale ogni lunedì</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Esempio Calcolo</h4>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Ordine da €25,00:</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>• Tariffa base</span>
                        <span>€2,00</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>• Bonus 5%</span>
                        <span>€1,25</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Totale per consegna</span>
                        <span>€3,25</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PrivateLayout>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <MobileHeader
        title="Orari e Stipendio"
        icon={<MaterialCommunityIcons name="account-cash-outline" size={20} color="white" />}
      />
      <ScrollView
        className="flex-1 bg-white mb-14"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Orari e Stipendio
            </Text>
            <View className="flex-row items-center gap-2">
              <View className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className="text-sm text-gray-600">
                {isConnected ? 'Connesso' : 'Disconnesso'}
              </Text>
            </View>
          </View>

          {/* Period Selector */}
          <View className="mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(['today', 'week', 'month'] as const).map((period) => (
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
                      {getPeriodText(period)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Earnings Summary */}
          <EarningsSummary 
            completedOrders={completedOrders} 
            period={selectedPeriod} 
          />

          {/* Detailed Stats */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4 flex-row items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Riepilogo Periodi
            </Text>
            <View className="space-y-4">
              {detailedStats.map((stat) => (
                <View 
                  key={stat.period}
                  className={`p-4 rounded-lg border-2 ${
                    stat.period === selectedPeriod
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-semibold text-gray-900">
                      {getPeriodText(stat.period)}
                    </Text>
                    <Text className="text-lg font-bold text-green-600">
                      {formatPrice(stat.totalEarnings)}
                    </Text>
                  </View>
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-600">Consegne</Text>
                      <Text className="font-semibold">{stat.totalDeliveries}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-600">Ore stimate</Text>
                      <Text className="font-semibold">{stat.estimatedHours.toFixed(1)}h</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-gray-600">€/Ora</Text>
                      <Text className="font-semibold">{formatPrice(stat.hourlyRate)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Weekly Trend */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Ultimi 7 Giorni
            </Text>
            <View className="space-y-2">
              {weeklyTrend.map((day, index) => (
                <View key={index} className="flex-row items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <View className="flex-row items-center gap-3">
                    <Text className="font-medium text-gray-900 w-12">
                      {day.date}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {day.deliveries} consegne
                    </Text>
                  </View>
                  <Text className="font-semibold text-green-600">
                    {formatPrice(day.earnings)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Payment Info */}
          <View className="bg-white rounded-lg border border-gray-200 p-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-600" />
              <Text className="text-lg font-semibold text-gray-900">
                Come Funziona il Pagamento
              </Text>
            </View>
            
            <View className="space-y-4">
              <View>
                <Text className="font-semibold text-gray-900 mb-2">Struttura Pagamento</Text>
                <View className="space-y-2">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 bg-blue-500 rounded-full" />
                    <Text className="text-sm text-gray-600">€2,00 fissi per consegna</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 bg-green-500 rounded-full" />
                    <Text className="text-sm text-gray-600">5% del valore dell'ordine</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 bg-purple-500 rounded-full" />
                    <Text className="text-sm text-gray-600">Pagamento settimanale</Text>
                  </View>
                </View>
              </View>

              <View className="bg-gray-50 p-4 rounded-lg">
                <Text className="font-semibold text-gray-900 mb-2">Esempio</Text>
                <Text className="text-sm text-gray-600">
                  Ordine da €25,00: €2,00 + €1,25 (5%) = €3,25 totale
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EarningsPage;
