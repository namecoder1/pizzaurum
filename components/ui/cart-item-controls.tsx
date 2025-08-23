import { CartItem } from "@/types/types";
import { Minus, Plus, Trash } from "lucide-react-native";
import React from "react";
import { Image, Platform, Text, TouchableOpacity, View } from "react-native";

interface CartItemControlsProps {
  item: CartItem;
  onUpdateQuantity: (uniqueId: string, quantity: number) => void;
  onRemoveItem: (uniqueId: string) => void;
  showImage?: boolean;
}

const CartItemControls: React.FC<CartItemControlsProps> = ({
  item,
  onUpdateQuantity,
  onRemoveItem,
  showImage = false,
}) => {
  const handleIncrement = () => {
    onUpdateQuantity(item.uniqueId, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.uniqueId, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    onRemoveItem(item.uniqueId);
  };

  // Calculate total price including customizations
  const calculateItemPrice = () => {
    const basePrice = item.price;
    const customizationsPrice =
      item.customizations?.reduce(
        (sum, customization) => sum + customization.price,
        0
      ) || 0;
    return (basePrice + customizationsPrice) * item.quantity;
  };

  if (Platform.OS === "web") {
    return (
      <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
        {showImage && item.image && (
          <img
            src={item.image}
            alt={item.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <h4 className="font-medium text-sm">{item.name}</h4>
          {item.customizations && item.customizations.length > 0 && (
            <p className="text-xs text-gray-500">
              {item.customizations.map((c) => c.name).join(", ")}
            </p>
          )}
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-semibold">
              €{calculateItemPrice().toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <button
            onClick={handleRemove}
            className="text-red-500 text-sm px-2 py-1 hover:bg-red-50 rounded mb-3"
          >
            <Trash size={16} />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDecrement}
              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-100"
            >
              -
            </button>
            <span className="mx-2 text-sm">{item.quantity}</span>
            <button
              onClick={handleIncrement}
              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-100"
            >
              +
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <View className="flex-row items-center justify-between p-3 border border-gray-200 rounded-lg mb-2">
      <View className="flex-1 flex-row items-start gap-3">
        <Image
          source={{ uri: item.image }}
          className="w-12 h-12 rounded-lg object-cover mb-2"
        />
        <View>
          <Text className="text-base font-semibold">{item.name}</Text>
          {item.customizations && item.customizations.length > 0 && (
            <View className="flex flex-col gap-1 text-sm text-gray-500 mt-1">
              {item.customizations.map((c) => (
                <Text key={c.name} className=" text-xs text-gray-500">
                  - {c.name}
                </Text>
              ))}
            </View>
          )}
          <Text className="text-sm font-bold mt-1">
            €{calculateItemPrice().toFixed(2)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="flex-row items-center border border-gray-300 rounded-lg">
          <TouchableOpacity
            onPress={handleDecrement}
            className="p-2 w-8 h-8 flex items-center justify-center"
          >
            <Minus size={16} />
          </TouchableOpacity>
          <Text className="px-3 py-1 text-base font-semibold">
            {item.quantity}
          </Text>
          <TouchableOpacity
            onPress={handleIncrement}
            className="p-2 w-8 h-8 flex items-center justify-center"
          >
            <Plus size={16} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleRemove}
          className="p-2 bg-red-100 rounded-lg"
        >
          <Trash size={14} color="#BE1522" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CartItemControls;
