import LoginModal from "@/components/(auth)/LoginModal";
import WebCard from "@/components/(public)/web-card";
import WebCardSkeleton from "@/components/(public)/web-card-skeleton";
import WebLayout from "@/components/(public)/web-layout";
import WebMonthly from "@/components/(public)/web-monthly";
import WebMonthlySkeleton from "@/components/(public)/web-monthly-skeleton";
import { useCleanQuery } from "@/hooks/useQueryStore";
import {
  DRINKS_QUERY,
  OTHERS_QUERY,
  PIZZAS_QUERY,
  PIZZAURUMS_QUERY,
  SPIANATAS_QUERY,
} from "@/sanity/queries";
import { ProductProps, SpianataProps } from "@/types/types";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { Platform } from "react-native";

const SectionTitle = ({ title }: { title: string }) => (
  <h2 className="text-3xl font-bold mb-6 text-gray-800">{title}</h2>
);

const MenuPage = () => {
  const os = Platform.OS;

  if (os !== "web") {
    return <Redirect href="/" />;
  }

  const [showLoginModal, setShowLoginModal] = useState(false);

  const { data: pizzas, loading: pizzasLoading } = useCleanQuery(PIZZAS_QUERY) as { data: ProductProps[], loading: boolean };
  const { data: pizzaurums, loading: pizzaurumsLoading } = useCleanQuery(PIZZAURUMS_QUERY) as {
    data: ProductProps[];
    loading: boolean;
  };
  const { data: drinks, loading: drinksLoading } = useCleanQuery(DRINKS_QUERY) as { data: ProductProps[], loading: boolean };
  const { data: others, loading: othersLoading } = useCleanQuery(OTHERS_QUERY) as { data: ProductProps[], loading: boolean };
  const { data: spianatas, loading: spianatasLoading } = useCleanQuery(SPIANATAS_QUERY) as { data: SpianataProps[], loading: boolean}

  // Mostra skeleton se almeno una query è in caricamento
  const isLoading = pizzasLoading || pizzaurumsLoading || drinksLoading || othersLoading || spianatasLoading;

  return (
    <WebLayout title="Menu | Pizzaurum" description="Menu della nostra pizzeria" >
      <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-12">
        {isLoading ? (
          <WebMonthlySkeleton />
        ) : (
          <WebMonthly onPress={() => setShowLoginModal(true)} />
        )}
        
        <div>
          <SectionTitle title="Le Nostre Pizze" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pizzasLoading ? (
              // Skeleton per le pizze
              Array(8).fill(0).map((_, index) => (
                <WebCardSkeleton key={`pizza-skeleton-${index}`} />
              ))
            ) : (
              pizzas?.map((pizza: ProductProps) => (
                <WebCard
                  props={pizza}
                  key={pizza.id}
                  onPress={() => setShowLoginModal(true)}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <SectionTitle title="Le Pizzaurum" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pizzaurumsLoading ? (
              // Skeleton per le pizzaurum
              Array(4).fill(0).map((_, index) => (
                <WebCardSkeleton key={`pizzaurum-skeleton-${index}`} />
              ))
            ) : (
              pizzaurums?.map((pizzaurum: ProductProps) => (
                <WebCard
                  props={pizzaurum}
                  key={pizzaurum.id}
                  onPress={() => setShowLoginModal(true)}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <SectionTitle title="Altro" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {othersLoading ? (
              // Skeleton per altri prodotti
              Array(6).fill(0).map((_, index) => (
                <WebCardSkeleton key={`other-skeleton-${index}`} />
              ))
            ) : (
              others?.map((other: ProductProps) => (
                <WebCard
                  props={other}
                  key={other.id}
                  onPress={() => setShowLoginModal(true)}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <SectionTitle title="Bevande" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {drinksLoading ? (
              // Skeleton per le bevande
              Array(6).fill(0).map((_, index) => (
                <WebCardSkeleton key={`drink-skeleton-${index}`} />
              ))
            ) : (
              drinks?.map((drink: ProductProps) => (
                <WebCard
                  props={drink}
                  key={drink.id}
                  onPress={() => setShowLoginModal(true)}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <SectionTitle title="Le Spianate" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {spianatasLoading ? (
              // Skeleton per le bevande
              Array(6).fill(0).map((_, index) => (
                <WebCardSkeleton key={`spianata-skeleton-${index}`} />
              ))
            ) : (
              spianatas?.map((spianata: SpianataProps) => (
                <WebCard
                  props={{...spianata, category: 'spianata'}}
                  key={spianata.id}
                  onPress={() => setShowLoginModal(true)}
                  availableOnSite
                />
              ))
            )}
          </div>
        </div>

        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          isMobile={false}
        />
      </div>
    </WebLayout>
  );
};

export default MenuPage;
