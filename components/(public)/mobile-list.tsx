import { useCleanQuery } from "@/hooks/useQueryStore";
import {
  DRINKS_QUERY,
  OTHERS_QUERY,
  PIZZAS_QUERY,
  PIZZAURUMS_QUERY,
} from "@/sanity/queries";
import { ProductProps } from "@/types/types";
import React from "react";
import { View } from "react-native";
import LoginModal from "../(auth)/LoginModal";
import SectionTitle from "../ui/section-title";
import MobileCard from "./mobile-card";

const MobileList = ({ showLoginModal, setShowLoginModal }: { showLoginModal: boolean, setShowLoginModal: (show: boolean) => void }) => {
  const { data: pizzas } = useCleanQuery(PIZZAS_QUERY) as { data: ProductProps[] };
  const { data: pizzaurums } = useCleanQuery(PIZZAURUMS_QUERY) as {
    data: ProductProps[];
  };
  const { data: drinks } = useCleanQuery(DRINKS_QUERY) as { data: ProductProps[] };
  const { data: others } = useCleanQuery(OTHERS_QUERY) as { data: ProductProps[] };

  return (
    <View className="flex-1">
      {/* Pizze Section */}
      <View className="mb-8">
        <SectionTitle platform="mobile" title="Le Nostre Pizze" />
        <View>
          {pizzas?.map((pizza: ProductProps) => (
            <MobileCard
              props={pizza}
              key={pizza.id}
              onPress={() => setShowLoginModal(true)}
            />
          ))}
        </View>
      </View>

      {/* Pizzaurum Section */}
      <View className="mb-8">
        <SectionTitle platform="mobile" title="Le Pizzaurum" />
        <View>
          {pizzaurums?.map((pizzaurum: ProductProps) => (
            <MobileCard
              props={pizzaurum}
              key={pizzaurum.id}
              onPress={() => setShowLoginModal(true)}
            />
          ))}
        </View>
      </View>

      {/* Altri Section */}
      <View className="mb-8">
        <SectionTitle platform="mobile" title="Altro" />
        <View>
          {others?.map((other: ProductProps) => (
            <MobileCard
              props={other}
              key={other.id}
              onPress={() => setShowLoginModal(true)}
            />
          ))}
        </View>
      </View>

      {/* Bevande Section */}
      <View className="mb-8">
        <SectionTitle platform="mobile" title="Bevande" />
        <View>
          {drinks?.map((drink: ProductProps) => (
            <MobileCard
              props={drink}
              key={drink.id}
              onPress={() => setShowLoginModal(true)}
            />
          ))}
        </View>
      </View>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        isMobile={true}
      />
    </View>
  );
};

export default MobileList;
