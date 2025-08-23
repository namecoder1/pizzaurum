import { useCartContext } from "@/contexts/cart-context";
import { ShoppingCartIcon } from "lucide-react-native";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

const MobileCartButton = ({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const os = Platform.OS;
  const { items } = useCartContext();
  if (os === "web") return null;

  const itemCount = items.length;

  if (os === 'ios') { 
    return (
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity
          className="bg-primary w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          onPress={() => setIsOpen(true)}
        >
          <ShoppingCartIcon color="white" size={24} />
        </TouchableOpacity>

        {itemCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 w-6 h-6 rounded-full flex items-center justify-center">
            <Text className="text-white text-xs font-bold">
              {itemCount > 9 ? "9+" : itemCount}
            </Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <View className="absolute bottom-[100px] right-4">
      <TouchableOpacity
        className="bg-primary w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        onPress={() => setIsOpen(true)}
      >
        <ShoppingCartIcon color="white" size={24} />
      </TouchableOpacity>

      {itemCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-red-500 w-6 h-6 rounded-full flex items-center justify-center">
          <Text className="text-white text-xs font-bold">
            {itemCount > 9 ? "9+" : itemCount}
          </Text>
        </View>
      )}
    </View>
  );
};

export default MobileCartButton;
