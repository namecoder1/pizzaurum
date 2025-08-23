import { useCleanQuery } from "@/hooks/useQueryStore";
import { MONTHLY_PIZZA_QUERY } from "@/sanity/queries";
import { ProductProps } from "@/types/types";
import React from "react";
import { View } from "react-native";
import SectionTitle from "../ui/section-title";
import MobileCard from "./mobile-card";

const MobileMonthly = ({ showLoginModal, setShowLoginModal }: { showLoginModal: boolean, setShowLoginModal: (show: boolean) => void }) => {
  const { data } = useCleanQuery(MONTHLY_PIZZA_QUERY) as { data: ProductProps[] };
  if (!data || data.length === 0) return null;
  const monthlyPizza = data[0];

  return (
    <View className="flex-1 rounded-xl mb-4">
      <SectionTitle platform="mobile" title="Pizza del mese" />
      <MobileCard props={monthlyPizza} onPress={() => setShowLoginModal(true)} isMonthlyPizza={true} />
    </View>
  );
};

export default MobileMonthly;
