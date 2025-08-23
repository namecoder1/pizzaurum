import { useCartContext } from "@/contexts/cart-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

const MobileCartNavButton = ({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const os = Platform.OS;
  const { totalItems } = useCartContext();
  
  // Only show on iOS mobile
  if (Platform.OS !== "ios") return null;

  return (
    <TouchableOpacity
      className="flex-1 items-center py-2 relative"
      onPress={() => setIsOpen(true)}
    >
      <Ionicons name="cart-outline" size={24} color="#6B7280" />
      <Text className="text-xs mt-1 text-gray-500">Carrello</Text>
      
      {totalItems > 0 && (
        <View className="absolute top-0 right-2 bg-red-500 w-5 h-5 rounded-full flex items-center justify-center">
          <Text className="text-white text-xs font-bold">
            {totalItems > 9 ? "9+" : totalItems}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default MobileCartNavButton; 