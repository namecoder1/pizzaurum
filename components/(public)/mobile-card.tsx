import { ProductProps } from "@/types/types";
import { AntDesign } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Button from "../ui/button";

interface MobileCardProps {
  props: ProductProps;
  onPress: () => void;
  isMonthlyPizza?: boolean;
}

const MobileCard = ({ props, onPress, isMonthlyPizza = false }: MobileCardProps) => {
  // Protezione contro doppi click
  const lastPressTime = useRef(0);
  const isProcessing = useRef(false);

  const handlePress = () => {
    const now = Date.now();
    
    // Preveni doppi click entro 500ms
    if (now - lastPressTime.current < 500 || isProcessing.current) {
      return;
    }
    
    lastPressTime.current = now;
    isProcessing.current = true;
    
    try {
      onPress();
    } finally {
      // Rilascia il lock dopo 500ms
      setTimeout(() => {
        isProcessing.current = false;
      }, 500);
    }
  };

  return (
    <Pressable className="mb-4">
      <View className={`rounded-xl border  ${isMonthlyPizza ? "bg-primary/5 border-primary/30" : "bg-white border-gray-200"}`}>
        <View className="flex-row">
          <Image
            className="w-40 h-full object-cover rounded-l-xl border-r border-gray-200"
            source={{ uri: props.image }}
          />

          {/* Contenuto a destra */}
          <View className="flex-1 p-4">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-2">
                <Text
                  className="text-lg font-bold text-gray-800 mb-1"
                  numberOfLines={1}
                >
                  {props.name}
                </Text>
                <Text className="text-xs text-orange-600 font-medium mb-2">
                  {props.category}
                </Text>
              </View>
              <Text className="text-lg font-bold text-gray-900">
                €{props.price.toFixed(2)}
              </Text>
            </View>

            <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
              {props.description}
            </Text>

            <View className="flex-row justify-end mt-2">
              <Button 
                icon={<AntDesign name="shoppingcart" size={20} color="#B91223" />} 
                text="Aggiungi" 
                onPress={handlePress}
              />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default MobileCard;
