import Button from "@/components/ui/button";
import { ProductProps } from "@/types/types";
import { AntDesign } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, View } from "react-native";

const WebCard = ({ props, onPress, availableOnSite }: { props: ProductProps, onPress: () => void, availableOnSite?: boolean }) => {

  
  return (
    <Pressable>
      <View className="bg-white w-full h-full flex flex-col justify-between rounded-t-3xl rounded-xl shadow-sm shadow-black/10 border border-gray-200 transition-all duration-300 hover:scale-[1.01]">
        <Image
          className="w-full h-56 rounded-t-3xl object-contain object-center"
          source={{ uri: props.image }}
        />
        <View className="my-4 px-5">
          <h3 className="text-xl font-bold text-gray-800">{props.name}</h3>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {props.description}
          </p>
          <p className="text-sm font-medium text-orange-600 mt-2">
            {props.category}
          </p>
        </View>
        <View className="flex-row justify-between items-center px-5 pb-5">
          <p className="text-xl font-bold text-gray-900">
            €{props.price.toFixed(2)}
          </p>
          {!availableOnSite ? (
            <Button icon={<AntDesign name="shoppingcart" size={20} color="#B91223" />} text="Aggiungi" onPress={onPress} />
          ) : (
            <p className="text-sm text-gray-600">Solo in pizzeria</p>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default WebCard;
