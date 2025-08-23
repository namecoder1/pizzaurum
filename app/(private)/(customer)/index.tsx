import MobileCard from "@/components/(public)/mobile-card";
import { useCleanQuery } from "@/hooks/useQueryStore";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  DRINKS_QUERY,
  MONTHLY_PIZZA_QUERY,
  OTHERS_QUERY,
  PIZZAS_QUERY,
  PIZZAURUMS_QUERY,
} from "@/sanity/queries";
import { ProductProps } from "@/types/types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import Loader from "../../../components/ui/Loader";
import { useAuth } from "../../../contexts/auth-context";
import { createClientSupabase } from "../../../lib/supabase";

import MobileHeader from "@/components/(private)/(admin)/mobile-header";

import MobileProductModal from "@/components/(private)/(customer)/mobile-product-modal";
import WebProductModal from "@/components/(private)/(customer)/web-product-modal";
import PrivateLayout from '@/components/(private)/private-layout';
import MobileMonthly from "@/components/(public)/mobile-monthly";
import WebCard from "@/components/(public)/web-card";
import WebMonthly from "@/components/(public)/web-monthly";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCartContext } from "@/contexts/cart-context";
import { usePizzaCustomization } from "@/hooks/use-pizza-customization";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

export default function CustomerDashboard() {
  const { session } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { 
    isOpen: dialogIsOpen,
    closeDialog,
    currentProductId,
    currentProductName,
    currentProductPrice,
    currentProductType,
    currentProductImage,
    quantity: customizationQuantity,
    openDialog 
  } = usePizzaCustomization();
  const { addItem } = useCartContext();
  const os = Platform.OS;
  const [loading, setLoading] = useState(true);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  
  // Protezione contro doppi click
  const isProcessingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  
  // Usa una singola istanza del client
  const supabaseClient = useMemo(() => createClientSupabase(), []);
  
  const { data: pizzas } = useCleanQuery(PIZZAS_QUERY) as { data: ProductProps[] };
  const { data: pizzaurums } = useCleanQuery(PIZZAURUMS_QUERY) as {
    data: ProductProps[];
  };
  const { data: drinks } = useCleanQuery(DRINKS_QUERY) as { data: ProductProps[] };
  const { data: others } = useCleanQuery(OTHERS_QUERY) as { data: ProductProps[] };
  const { data: monthly } = useCleanQuery(MONTHLY_PIZZA_QUERY) as {
    data: ProductProps[];
  };
  const [selectedTab, setSelectedTab] = useState("pizzaurum");
  
  // Funzione per prevenire doppi click
  const preventDoubleClick = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 500 || isProcessingRef.current) {
      return false;
    }
    lastClickTimeRef.current = now;
    isProcessingRef.current = true;
    return true;
  };

  // Funzione per rilasciare il lock
  const releaseClickLock = () => {
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 500);
  };
  
  const checkUserProfile = async () => {
    setIsCheckingProfile(true);

    try {
      if (!session?.user) {
        return false;
      }

      if (!profile) {
        return false;
      }

      if (!profile?.phone_verified) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking user profile:", error);
      return false;
    } finally {
      setIsCheckingProfile(false);
    }
  };

  const handlePizzaSelect = (pizza: ProductProps) => {
    if (!preventDoubleClick()) return;
    
    try {
      openDialog(
        {
          id: pizza.id,
          name: pizza.name,
          price: pizza.price,
          type: "pizza",
          image: pizza.image,
        },
        1
      );
    } finally {
      releaseClickLock();
    }
  };

  const handlePizzaurumSelect = (pizzaurum: ProductProps) => {
    if (!preventDoubleClick()) return;
    
    try {
      openDialog(
        {
          id: pizzaurum.id,
          name: pizzaurum.name,
          price: pizzaurum.price,
          type: "pizzaurum",
          image: pizzaurum.image,
        },
        1
      );
    } finally {
      releaseClickLock();
    }
  };

  const handleDrinkSelect = async (drink: ProductProps) => {
    if (!preventDoubleClick()) return;
    
    try {
      // Verify user profile before adding to cart
      const profileComplete = await checkUserProfile();

      if (!profileComplete) {
        return;
      }

      // Add directly to cart without customization
      const cartItem = {
        id: drink.id,
        name: drink.name,
        price: drink.price,
        quantity: 1,
        image: drink.image,
        type: "drink" as const,
        customizationTimestamp: Date.now(),
      };

      addItem(cartItem);
    } finally {
      releaseClickLock();
    }
  };

  const handleOtherSelect = async (other: ProductProps) => {
    if (!preventDoubleClick()) return;
    
    try {
      // Verify user profile before adding to cart
      const profileComplete = await checkUserProfile();

      if (!profileComplete) {
        return;
      }

      // Add directly to cart without customization
      const cartItem = {
        id: other.id,
        name: other.name,
        price: other.price,
        quantity: 1,
        image: other.image,
        type: "other" as const,
        customizationTimestamp: Date.now(),
      };

      addItem(cartItem);
    } finally {
      releaseClickLock();
    }
  };

  const handleProductSelect = async (product: ProductProps) => {
    if (!preventDoubleClick()) return;
    
    try {
      if (!pizzas || !pizzaurums) {
        return;
      }

      // Check if product is customizable (pizza or pizzaurum)
      // First check the category field
      let isCustomizable =
        product.category === "pizza" || product.category === "pizzaurum";

      // If category is undefined or doesn't match, check if the product is in the pizzas or pizzaurums arrays
      if (!isCustomizable && (!product.category || product.category === "")) {
        const isPizza = pizzas?.some((p) => p.id === product.id);
        const isPizzaurum = pizzaurums?.some((p) => p.id === product.id);
        isCustomizable = isPizza || isPizzaurum;
      }

      // Additional check: if the product is in the pizzas or pizzaurums arrays, it's customizable
      if (!isCustomizable) {
        const isPizza = pizzas?.some((p) => p.id === product.id);
        const isPizzaurum = pizzaurums?.some((p) => p.id === product.id);
        isCustomizable = isPizza || isPizzaurum;
      }

      if (isCustomizable) {
        // Open product modal for customization
        openDialog(
          {
            id: product.id,
            name: product.name,
            price: product.price,
            type:
              product.category ||
              (pizzas?.some((p) => p.id === product.id) ? "pizza" : "pizzaurum"),
            image: product.image,
          },
          1
        );
      } else {
        // Verify user profile before adding to cart
        const profileComplete = await checkUserProfile();

        if (!profileComplete) {
          return;
        }

        // Add directly to cart without customization
        const cartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
          type: (product.category as "drink" | "other") || "other",
          customizationTimestamp: Date.now(),
        };

        addItem(cartItem);
      }
    } finally {
      releaseClickLock();
    }
  };

  useEffect(() => {
    if (!session) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          // The useUserProfile hook will handle setting the profile
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  if (loading) {
    return <Loader size="fullscreen" text="Caricamento menù..." />;
  }

  if (os === "web") {
    return (
      <PrivateLayout title="Ordina online | Pizzaurum" description="Ordina online">
        <section className="max-w-7xl mx-auto mt-10 px-4 w-full">
          <WebMonthly onPress={() => handleProductSelect(monthly[0])} />
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 w-full">
            <TabsList className="flex flex-row mb-4 w-full">
              <TabsTrigger className="flex-1" value="pizzaurum">
                <Text>Pizzaurum</Text>
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="pizza">
                <Text>Pizza</Text>
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="other">
                <Text>Altro</Text>
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="drink">
                <Text>Drink</Text>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pizzaurum">
              <ProductsGroup title="Le pizzaurum" os={os}>
                {pizzaurums?.map((pizzaurum: ProductProps) => (
                  <WebCard
                    key={pizzaurum.id}
                    props={pizzaurum}
                    onPress={() => handlePizzaurumSelect(pizzaurum)}
                  />
                ))}
              </ProductsGroup>
            </TabsContent>
            <TabsContent value="pizza">
              <ProductsGroup title="Le pizze" os={os}>
                {pizzas?.map((pizza: ProductProps) => (
                  <WebCard
                    key={pizza.id}
                    props={pizza}
                    onPress={() => handlePizzaSelect(pizza)}
                  />
                ))}
              </ProductsGroup>
            </TabsContent>
            <TabsContent value="other">
              <ProductsGroup title="Altri prodotti" os={os}>
                {others?.map((other: ProductProps) => (
                  <WebCard
                    key={other.id}
                    props={other}
                    onPress={() => handleOtherSelect(other)}
                  />
                ))}
              </ProductsGroup>
            </TabsContent>
            <TabsContent value="drink">
              <ProductsGroup title="Bevande" os={os}>
                {drinks?.map((drink: ProductProps) => (
                  <WebCard
                    key={drink.id}
                    props={drink}
                    onPress={() => handleDrinkSelect(drink)}
                  />
                ))}
              </ProductsGroup>
            </TabsContent>
          </Tabs>
          {dialogIsOpen && currentProductId && currentProductName && os === "web" && (
            <WebProductModal 
              product={{
                id: currentProductId,
                name: currentProductName,
                price: currentProductPrice || 0,
                image: currentProductImage || "",
                type: (currentProductType as "pizza" | "pizzaurum") || "pizza"
              }}
              initialQuantity={customizationQuantity}
            />
          )}
        </section>
      </PrivateLayout>
    );
  }

  // Mobile Layout
  return (
    <SafeAreaView className="flex-1 mb-16">
      <MobileHeader title="Ordina" icon="pizza-outline" />
      <ScrollView className={`flex-1 px-6 py-6 ${Platform.OS === "ios" ? "pb-32" : ""}`}>

        <MobileMonthly
          showLoginModal={false}
          setShowLoginModal={() => handlePizzaSelect(monthly[0])}
        />
        <ProductsGroup title="Le nostre pizze" os={os}>
          {pizzas?.map((pizza: ProductProps) => (
            <MobileCard
              key={pizza.id}
              props={pizza}
              onPress={() => handlePizzaSelect(pizza)}
            />
          ))}
        </ProductsGroup>
        <ProductsGroup title="Le nostre pizzaurum" os={os}>
          {pizzaurums?.map((pizzaurum: ProductProps) => (
            <MobileCard
              key={pizzaurum.id}
              props={pizzaurum}
              onPress={() => handlePizzaurumSelect(pizzaurum)}
            />
          ))}
        </ProductsGroup>
        <ProductsGroup title="Altri prodotti" os={os}>
          {others?.map((other: ProductProps) => (
            <MobileCard
              key={other.id}
              props={other}
              onPress={() => handleOtherSelect(other)}
            />
          ))}
        </ProductsGroup>
        <ProductsGroup title="Bevande" os={os}>
          {drinks?.map((drink: ProductProps) => (
            <MobileCard
              key={drink.id}
              props={drink}
              onPress={() => handleDrinkSelect(drink)}
            />
          ))}
        </ProductsGroup>
      </ScrollView>

      {/* Debug  */}
      
      {dialogIsOpen && currentProductId && currentProductName && (
        <MobileProductModal 
          product={{
            id: currentProductId,
            name: currentProductName,
            price: currentProductPrice || 0,
            image: currentProductImage || "",
            type: (currentProductType as "pizza" | "pizzaurum") || "pizza"
          }}
          initialQuantity={customizationQuantity}
        />
      )}
    </SafeAreaView>
  );
}

const ProductsGroup = ({
  title,
  children,
  os,
}: {
  title: string;
  children: React.ReactNode;
  os: string;
}) => {
  if (os === "web") {
    return (
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <View className="mb-8">
      <Text className="text-2xl font-bold text-gray-800 mb-4">{title}</Text>
      {children}
    </View>
  );
};
