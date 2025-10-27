import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OrderProps } from "@/types/types";
import { Clock, DollarSign, MapPin, Package } from "lucide-react-native";
import { Platform, Text, TouchableOpacity, View } from "react-native";

interface OrderCardProps {
  order: OrderProps;
  type: 'available' | 'assigned' | 'completed';
  onAssign?: (orderId: string) => void;
  onComplete?: (orderId: string) => void;
  onViewDetails?: (order: OrderProps) => void;
}

export function OrderCard({ order, type, onAssign, onComplete, onViewDetails }: OrderCardProps) {
  const isWeb = Platform.OS === 'web';
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  const getStatusColor = (status: OrderProps['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'in_preparation':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready_to_pickup':
        return 'bg-green-100 text-green-800';
      case 'delivering':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: OrderProps['status']) => {
    switch (status) {
      case 'accepted':
        return 'Accettato';
      case 'in_preparation':
        return 'In Preparazione';
      case 'ready_to_pickup':
        return 'Pronto';
      case 'delivering':
        return 'In Consegna';
      case 'delivered':
        return 'Consegnato';
      case 'completed':
        return 'Completato';
      default:
        return status;
    }
  };

  if (isWeb) {
    return (
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={20} color="#4b5563" />
              <Text className="font-semibold text-gray-900">
                Ordine #{order.id.slice(-8)}
              </Text>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {getStatusText(order.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={16} color="#6b7280" />
              <Text>Ordinato alle {formatTime(order.created_at)}</Text>
              {order.customer_time && (
                <Text className="ml-2 font-medium">
                  • Richiesto per le {formatTime(order.customer_time)}
                </Text>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <DollarSign size={16} color="#6b7280" />
              <Text className="font-semibold">{formatPrice(order.price)}</Text>
              <Text>• {order.products.length} prodotti</Text>
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={16} color="#6b7280" />
              <Text>Consegna a domicilio</Text>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex gap-2">
                {type === 'available' && onAssign && (
                  <Button 
                    onPress={() => onAssign(order.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    text="Prendi Ordine"
                  />  
                )}
                {type === 'assigned' && onComplete && order.status === 'delivering' && (
                  <Button 
                    onPress={() => onComplete(order.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    text="Segna come Consegnato"
                  />
                )}
                <Button 
                  variant="outline"
                  onPress={() => onViewDetails?.(order)}
                  className="flex-1"
                  text="Dettagli"
                >
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <View className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Package size={20} color="#4b5563" />
          <Text className="font-semibold text-gray-900">
            Ordine #{order.id.slice(-8)}
          </Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
          <Text className="text-xs font-medium">
            {getStatusText(order.status)}
          </Text>
        </View>
      </View>

      <View className="space-y-3">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600">
            Ordinato alle {formatTime(order.created_at)}
          </Text>
          {order.customer_time && (
            <Text className="text-sm font-medium text-gray-700 ml-2">
              • {formatTime(order.customer_time)}
            </Text>
          )}
        </View>
        
        <View className="flex-row items-center gap-2">
          <DollarSign size={16} color="#6b7280" />
          <Text className="text-sm font-semibold text-gray-900">
            {formatPrice(order.price)}
          </Text>
          <Text className="text-sm text-gray-600">
            • {order.products.length} prodotti
          </Text>
        </View>

        <View className="flex-row items-start gap-2">
          <MapPin size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600">Consegna a domicilio</Text>
        </View>

        <View className="flex-row gap-2 pt-3 border-t border-gray-200">
          {type === 'available' && onAssign && (
            <TouchableOpacity
              onPress={() => onAssign(order.id)}
              className="flex-1 bg-blue-600 rounded-lg py-3"
            >
              <Text className="text-white font-semibold text-center">
                Prendi Ordine
              </Text>
            </TouchableOpacity>
          )}
          {type === 'assigned' && onComplete && order.status === 'delivering' && (
            <TouchableOpacity
              onPress={() => onComplete(order.id)}
              className="flex-1 bg-green-600 rounded-lg py-3"
            >
              <Text className="text-white font-semibold text-center">
                Segna come Consegnato
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onViewDetails?.(order)}
            className="flex-1 border border-gray-300 rounded-lg py-3"
          >
            <Text className="text-gray-700 font-semibold text-center">
              Dettagli
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
