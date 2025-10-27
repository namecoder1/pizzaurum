import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { Clock, CreditCard, DollarSign, MapPin, Package, X } from "lucide-react-native";
import { OrderProductProps, OrderProps } from "@/types/types";
import { Modal, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface OrderDetailsModalProps {
  order: OrderProps | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign?: (orderId: string) => void;
  onComplete?: (orderId: string) => void;
  type: 'available' | 'assigned' | 'completed';
}

export function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose, 
  onAssign, 
  onComplete, 
  type 
}: OrderDetailsModalProps) {
  const isWeb = Platform.OS === 'web';

  if (!order) return null;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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

  const getPaymentText = (payment: string) => {
    switch (payment) {
      case 'cash':
        return 'Contanti';
      case 'card':
        return 'Carta';
      case 'online':
        return 'Online';
      default:
        return payment;
    }
  };

  const renderProductItem = (product: OrderProductProps, index: number) => (
    <View key={index} className="flex-row justify-between items-start py-2 border-b border-gray-100">
      <View className="flex-1">
        <Text className="font-medium text-gray-900">
          {product.quantity}x {product.name}
        </Text>
        {product.extras && product.extras.length > 0 && (
          <View className="mt-1">
            {product.extras.map((extra, extraIndex) => (
              <Text key={extraIndex} className="text-sm text-gray-600 ml-2">
                + {extra.name} ({formatPrice(extra.price)})
              </Text>
            ))}
          </View>
        )}
      </View>
      <Text className="font-semibold text-gray-900">
        {formatPrice(product.price * product.quantity)}
      </Text>
    </View>
  );

  if (isWeb) {
    return (
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Dettagli Ordine #{order.id.slice(-8)}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-6 space-y-6">
                {/* Status e Info Base */}
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusText(order.status)}
                  </Badge>
                  <Text className="text-sm text-gray-600">
                    {formatDate(order.created_at)} alle {formatTime(order.created_at)}
                  </Text>
                </div>

                {/* Informazioni Ordine */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <div>
                      <Text className="text-sm text-gray-600">Orario richiesto</Text>
                      <Text className="font-medium">
                        {order.customer_time 
                          ? formatTime(order.customer_time)
                          : 'Prima possibile'
                        }
                      </Text>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <div>
                      <Text className="text-sm text-gray-600">Pagamento</Text>
                      <Text className="font-medium">
                        {getPaymentText(order.payment)}
                        {order.is_paid && <Text className="text-green-600"> • Pagato</Text>}
                      </Text>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <div>
                      <Text className="text-sm text-gray-600">Tipo</Text>
                      <Text className="font-medium">
                        {order.is_delivery ? 'Consegna a domicilio' : 'Ritiro in sede'}
                      </Text>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                    <div>
                      <Text className="text-sm text-gray-600">Totale</Text>
                      <Text className="font-semibold text-lg">
                        {formatPrice(order.price)}
                      </Text>
                    </div>
                  </div>
                </div>

                {/* Prodotti */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-gray-600" />
                    <Text className="font-semibold text-gray-900">
                      Prodotti ({order.products.length})
                    </Text>
                  </div>
                  <div className="space-y-2">
                    {order.products.map(renderProductItem)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                {type === 'available' && onAssign && (
                  <Button 
                    onPress={() => {
                      onAssign(order.id);
                      onClose();
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    text="Prendi Ordine"
                  />
                )}
                {type === 'assigned' && onComplete && (
                  <Button 
                    onPress={() => {
                      onComplete(order.id);
                      onClose();
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    text="Segna come Consegnato"
                  />
                )}
                <Button 
                  variant="outline"
                  onPress={onClose}
                  className="flex-1"
                  text="Chiudi"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 justify-end">
          <View className="bg-white rounded-t-xl max-h-[90%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">
                Ordine #{order.id.slice(-8)}
              </Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X className="w-6 h-6 text-gray-500" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="p-4 space-y-4">
                {/* Status */}
                <View className="flex-row items-center justify-between">
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    <Text className="text-sm font-medium">
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-600">
                    {formatDate(order.created_at)}
                  </Text>
                </View>

                {/* Info Grid */}
                <View className="space-y-3">
                  <View className="flex-row items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <View>
                      <Text className="text-sm text-gray-600">Orario richiesto</Text>
                      <Text className="font-medium">
                        {order.customer_time 
                          ? formatTime(order.customer_time)
                          : 'Prima possibile'
                        }
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    <View>
                      <Text className="text-sm text-gray-600">Pagamento</Text>
                      <Text className="font-medium">
                        {getPaymentText(order.payment)}
                        {order.is_paid && <Text className="text-green-600"> • Pagato</Text>}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                    <View>
                      <Text className="text-sm text-gray-600">Totale</Text>
                      <Text className="font-semibold text-lg">
                        {formatPrice(order.price)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Prodotti */}
                <View>
                  <View className="flex-row items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-gray-600" />
                    <Text className="font-semibold text-gray-900">
                      Prodotti ({order.products.length})
                    </Text>
                  </View>
                  <View className="space-y-2">
                    {order.products.map(renderProductItem)}
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View className="p-4 border-t border-gray-200 bg-gray-50">
              <View className="flex-row gap-2">
                {type === 'available' && onAssign && (
                  <TouchableOpacity
                    onPress={() => {
                      onAssign(order.id);
                      onClose();
                    }}
                    className="flex-1 bg-blue-600 rounded-lg py-3"
                  >
                    <Text className="text-white font-semibold text-center">
                      Prendi Ordine
                    </Text>
                  </TouchableOpacity>
                )}
                {type === 'assigned' && onComplete && (
                  <TouchableOpacity
                    onPress={() => {
                      onComplete(order.id);
                      onClose();
                    }}
                    className="flex-1 bg-green-600 rounded-lg py-3"
                  >
                    <Text className="text-white font-semibold text-center">
                      Segna come Consegnato
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 border border-gray-300 rounded-lg py-3"
                >
                  <Text className="text-gray-700 font-semibold text-center">
                    Chiudi
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
