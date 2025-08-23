import { useCleanQuery } from "@/hooks/useQueryStore";
import { MONTHLY_PIZZA_QUERY } from "@/sanity/queries";
import { ProductProps } from "@/types/types";
import { AntDesign } from "@expo/vector-icons";
import React from "react";
import { Image } from "react-native";
import Button from "../ui/button";
import SectionTitle from "../ui/section-title";

const WebMonthly = ({ onPress }: { onPress: () => void }) => {
  const { data } = useCleanQuery(MONTHLY_PIZZA_QUERY) as { data: ProductProps[] };
  if (!data || data.length === 0) return null;
  const monthlyPizza = data[0];

  return (
    <div className="mb-16 ">
      <SectionTitle platform="web" title="Pizza del mese" />

      <div className="w-full h-full flex flex-col sm:flex-row items-start gap-4 bg-white rounded-xl rounded-l-3xl shadow-sm shadow-black/10 border border-gray-200">
        <Image
          source={{ uri: monthlyPizza.image }}
          className="w-full sm:w-1/2 min-h-80 rounded-t-3xl sm:rounded-tr-none sm:rounded-l-3xl h-full object-cover object-center"
        />
        <div className="flex flex-col gap-2 w-full items-start justify-between p-4 sm:p-10 sm:pl-4">
          <div className="flex flex-row items-start justify-between w-full pr-4">
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                {monthlyPizza.name}
              </h2>
              <p className="p-2 bg-primary/10 w-fit rounded-xl text-primary text-sm font-bold">
                {monthlyPizza.category}
              </p>
              <p className="text-gray-600">{monthlyPizza.description}</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              €{monthlyPizza.price.toFixed(2)}
            </p>
          </div>
          <Button
            icon={<AntDesign name="shoppingcart" size={20} color="#B91223" />}
            className="w-fit ml-auto"
            text="Aggiungi"
            onPress={onPress}
          />
        </div>
      </div>
    </div>
  );
};

export default WebMonthly;
