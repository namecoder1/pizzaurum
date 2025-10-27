import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OrderProps } from "@/types/types";
import { Clock, DollarSign, TrendingUp, Truck } from "lucide-react-native";
import { Platform, Text, View } from "react-native";

interface EarningsSummaryProps {
  completedOrders: OrderProps[];
  period: 'today' | 'week' | 'month';
}

export function EarningsSummary({ completedOrders, period }: EarningsSummaryProps) {
  const isWeb = Platform.OS === 'web';

  const calculateEarnings = () => {
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

    const avgOrderValue = totalDeliveries > 0 ? totalRevenue / totalDeliveries : 0;
    const avgEarningsPerOrder = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

    return {
      totalDeliveries,
      totalRevenue,
      totalEarnings,
      avgOrderValue,
      avgEarningsPerOrder,
      orders: filteredOrders
    };
  };

  const stats = calculateEarnings();

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  const getPeriodText = () => {
    switch (period) {
      case 'today':
        return 'Oggi';
      case 'week':
        return 'Questa Settimana';
      case 'month':
        return 'Questo Mese';
    }
  };

  const calculateHoursWorked = () => {
    if (stats.orders.length === 0) return 0;
    
    // Stima: 30 minuti per consegna (preparazione + viaggio)
    const avgMinutesPerDelivery = 30;
    const totalMinutes = stats.totalDeliveries * avgMinutesPerDelivery;
    return Math.round((totalMinutes / 60) * 10) / 10; // Arrotonda a 1 decimale
  };

  const hoursWorked = calculateHoursWorked();
  const hourlyRate = hoursWorked > 0 ? stats.totalEarnings / hoursWorked : 0;

  if (isWeb) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Text className="text-sm font-medium text-gray-600">
                Guadagno {getPeriodText()}
              </Text>
              <DollarSign size={16} color="#059669" />
            </div>
          </CardHeader>
          <CardContent>
            <Text className="text-2xl font-bold text-green-600">
              {formatPrice(stats.totalEarnings)}
            </Text>
            <Text className="text-sm text-gray-500">
              {stats.totalDeliveries} consegne
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Text className="text-sm font-medium text-gray-600">
                Consegne
              </Text>
              <Truck size={16} color="#2563eb" />
            </div>
          </CardHeader>
          <CardContent>
            <Text className="text-2xl font-bold text-blue-600">
              {stats.totalDeliveries}
            </Text>
            <Text className="text-sm text-gray-500">
              Media: {formatPrice(stats.avgEarningsPerOrder)} / ordine
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Text className="text-sm font-medium text-gray-600">
                Ore Lavorate
              </Text>
              <Clock size={16} color="#ea580c" />
            </div>
          </CardHeader>
          <CardContent>
            <Text className="text-2xl font-bold text-orange-600">
              {hoursWorked}h
            </Text>
            <Text className="text-sm text-gray-500">
              Stima basata su consegne
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Text className="text-sm font-medium text-gray-600">
                € / Ora
              </Text>
              <TrendingUp size={16} color="#9333ea" />
            </div>
          </CardHeader>
          <CardContent>
            <Text className="text-2xl font-bold text-purple-600">
              {formatPrice(hourlyRate)}
            </Text>
            <Text className="text-sm text-gray-500">
              Tariffa oraria media
            </Text>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-4">
        Riepilogo {getPeriodText()}
      </Text>
      
      <View className="flex-row flex-wrap gap-4">
        <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1 min-w-[140px]">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600">Guadagno</Text>
            <DollarSign size={16} color="#059669" />
          </View>
          <Text className="text-xl font-bold text-green-600">
            {formatPrice(stats.totalEarnings)}
          </Text>
          <Text className="text-xs text-gray-500">
            {stats.totalDeliveries} consegne
          </Text>
        </View>

        <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1 min-w-[140px]">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600">Consegne</Text>
            <Truck size={16} color="#2563eb" />
          </View>
          <Text className="text-xl font-bold text-blue-600">
            {stats.totalDeliveries}
          </Text>
          <Text className="text-xs text-gray-500">
            {formatPrice(stats.avgEarningsPerOrder)}/ordine
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-4 mt-4">
        <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1 min-w-[140px]">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600">Ore</Text>
            <Clock size={16} color="#ea580c" />
          </View>
          <Text className="text-xl font-bold text-orange-600">
            {hoursWorked}h
          </Text>
          <Text className="text-xs text-gray-500">
            Stima
          </Text>
        </View>

        <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1 min-w-[140px]">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-600">€/Ora</Text>
            <TrendingUp size={16} color="#9333ea" />
          </View>
          <Text className="text-xl font-bold text-purple-600">
            {formatPrice(hourlyRate)}
          </Text>
          <Text className="text-xs text-gray-500">
            Media
          </Text>
        </View>
      </View>

      <View className="bg-blue-50 rounded-lg p-4 mt-4">
        <Text className="text-sm font-medium text-blue-900 mb-1">
          Come vengono calcolati i guadagni:
        </Text>
        <Text className="text-sm text-blue-700">
          • €2,00 fissi per ogni consegna completata
        </Text>
        <Text className="text-sm text-blue-700">
          • 5% del valore totale dell'ordine come commissione
        </Text>
      </View>
    </View>
  );
}
