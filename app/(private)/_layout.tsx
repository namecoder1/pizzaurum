import MobileCart from "@/components/(private)/(customer)/mobile-cart";
import MobileCartButton from "@/components/(private)/(customer)/mobile-cart-button";
import WebCart from "@/components/(private)/(customer)/web-cart";
import { useCartContext } from "@/contexts/cart-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, View } from "react-native";
import Navbar from "../../components/(private)/navbar";

export default function PrivateLayout() {
  const os = Platform.OS;
  const [isOpen, setIsOpen] = useState(false);
  const { totalItems } = useCartContext();
  const { isAdmin } = useUserProfile();

  // Opzioni comuni per disabilitare il gesto di swipe su iOS
  const screenOptions = {
    headerShown: false,
    gestureEnabled: false, // Disabilita il gesto di swipe
    animation: 'slide_from_right' as const, // Mantiene l'animazione di transizione
  };

  const content = useMemo(() => {
    if (os === "web") {
      return (
        <main className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="pt-20">
            <Stack screenOptions={screenOptions}>
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="(admin)" />
            </Stack>
            {totalItems > 0 && !isAdmin && (
              <WebCart isOpen={isOpen} setIsOpen={setIsOpen} />
            )}
          </div>
        </main>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(admin)" />
        </Stack>
        {!isAdmin && (
          <>
            <MobileCart isOpen={isOpen} closeDialog={() => setIsOpen(false)} />
            {/* Only show floating cart button on Android, iOS uses bottom nav */}
            {Platform.OS === "android" && (
              <MobileCartButton setIsOpen={setIsOpen} />
            )}
          </>
        )}
      </View>
    );
  }, [os, isOpen, totalItems, isAdmin]);

  return content;
}
