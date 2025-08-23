import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import "react-native-gesture-handler";
import { AuthProvider } from "../contexts/auth-context";
import { CartProvider } from "../contexts/cart-context";
import { SupabaseProvider } from "../contexts/supabase-context";
import "../global.css";

import { CormorantGaramond_300Light } from "@expo-google-fonts/cormorant-garamond/300Light";
import { CormorantGaramond_300Light_Italic } from "@expo-google-fonts/cormorant-garamond/300Light_Italic";
import { CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond/400Regular";
import { CormorantGaramond_400Regular_Italic } from "@expo-google-fonts/cormorant-garamond/400Regular_Italic";
import { CormorantGaramond_500Medium } from "@expo-google-fonts/cormorant-garamond/500Medium";
import { CormorantGaramond_500Medium_Italic } from "@expo-google-fonts/cormorant-garamond/500Medium_Italic";
import { CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond/600SemiBold";
import { CormorantGaramond_600SemiBold_Italic } from "@expo-google-fonts/cormorant-garamond/600SemiBold_Italic";
import { CormorantGaramond_700Bold } from "@expo-google-fonts/cormorant-garamond/700Bold";
import { CormorantGaramond_700Bold_Italic } from "@expo-google-fonts/cormorant-garamond/700Bold_Italic";
import { useFonts } from "@expo-google-fonts/cormorant-garamond/useFonts";

import StripeProvider from "@/components/stripe-provider";
import Loader from "@/components/ui/Loader";
import { preloadResources } from "@/utils/performance";
import { Hind_300Light } from "@expo-google-fonts/hind/300Light";
import { Hind_400Regular } from "@expo-google-fonts/hind/400Regular";
import { Hind_500Medium } from "@expo-google-fonts/hind/500Medium";
import { Hind_600SemiBold } from "@expo-google-fonts/hind/600SemiBold";
import { Hind_700Bold } from "@expo-google-fonts/hind/700Bold";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useBackgroundNotificationHandler } from "../hooks/useBackgroundNotificationHandler";
import { LoaderProvider } from "../hooks/useLoader";

function AppContent() {
  // Inizializza il gestore delle notifiche in background
  useBackgroundNotificationHandler();

  return (
    <BottomSheetModalProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(private)" />
      </Stack>
      <PortalHost />
    </BottomSheetModalProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold_Italic,
    CormorantGaramond_700Bold_Italic,
    Hind_300Light,
    Hind_400Regular,
    Hind_500Medium,
    Hind_600SemiBold,
    Hind_700Bold,
  });

  const [resourcesLoaded, setResourcesLoaded] = useState(false);

  // Preload delle risorse quando i font sono caricati
  useEffect(() => {
    if (fontsLoaded && !resourcesLoaded) {
      preloadResources().then(() => {
        setResourcesLoaded(true);
      });
    }
  }, [fontsLoaded, resourcesLoaded]);

  // Mostra un loader minimo mentre i font e le risorse si caricano
  if (!fontsLoaded || !resourcesLoaded) {
    return <Loader size="fullscreen" text="Caricamento..." />;
  }

  return (
    <SafeAreaProvider>
      <StripeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <LoaderProvider>
            <SupabaseProvider>
              <AuthProvider>
                <CartProvider>
                  <AppContent />
                </CartProvider>
              </AuthProvider>
            </SupabaseProvider>
          </LoaderProvider>
        </GestureHandlerRootView>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
