import MobileCart from "@/components/(private)/(customer)/mobile-cart";
import MobileCartButton from "@/components/(private)/(customer)/mobile-cart-button";
import WebCart from "@/components/(private)/(customer)/web-cart";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/contexts/auth-context";
import { useCartContext } from "@/contexts/cart-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Navbar from "../../components/(private)/navbar";

export default function PrivateLayout() {
  const os = Platform.OS;
  const [isOpen, setIsOpen] = useState(false);
  const { totalItems } = useCartContext();
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, isRider, profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const segments = useSegments();
  const redirectAttempted = useRef(false);

  // Opzioni comuni per disabilitare il gesto di swipe su iOS
  const screenOptions = {
    headerShown: false,
    gestureEnabled: false, // Disabilita il gesto di swipe
    animation: 'slide_from_right' as const, // Mantiene l'animazione di transizione
  };

  // SECURITY: Redirect logic nel layout principale per assicurare che l'utente sia nella route corretta
  const handleRoleBasedRedirect = useCallback(() => {
    const allLoaded = !authLoading && !profileLoading;
    
    if (!allLoaded) {
      console.log('⏳ PrivateLayout: Still loading, skipping redirect check');
      return;
    }

    if (redirectAttempted.current) {
      console.log('🚫 PrivateLayout: Redirect already attempted, skipping');
      return;
    }

    // Verifica in quale area siamo attualmente
    const inPrivate = segments[0] === '(private)';
    if (!inPrivate) {
      console.log('📍 PrivateLayout: Not in private area, skipping redirect');
      return;
    }

    const currentArea = segments[1]; // (admin), (customer), o (rider)

    console.log('🔍 PrivateLayout Debug:', {
      session: !!session,
      currentArea,
      profileRole: profile?.role,
      isAdmin,
      isRider,
      segments,
    });

    // SECURITY: Verifica che l'utente sia nell'area corretta per il suo ruolo
    if (profile?.role === "admin" && currentArea !== "(admin)") {
      redirectAttempted.current = true;
      console.log('👑 PrivateLayout: Admin in wrong area, redirecting to admin');
      router.replace("/(private)/(admin)");
      return;
    }

    if (profile?.role === "driver" && currentArea !== "(rider)") {
      redirectAttempted.current = true;
      console.log('🏍️ PrivateLayout: Rider in wrong area, redirecting to rider');
      router.replace("/(private)/(rider)");
      return;
    }

    if (profile?.role === "customer" && currentArea !== "(customer)") {
      redirectAttempted.current = true;
      console.log('🛒 PrivateLayout: Customer in wrong area, redirecting to customer');
      router.replace("/(private)/(customer)");
      return;
    }

    console.log('✅ PrivateLayout: User in correct area');
  }, [authLoading, profileLoading, session, profile?.role, isAdmin, isRider, segments, router]);

  useEffect(() => {
    handleRoleBasedRedirect();
  }, [handleRoleBasedRedirect]);

  // Reset redirect flag when role or segments change
  useEffect(() => {
    redirectAttempted.current = false;
  }, [profile?.role, segments[1]]);

  const content = useMemo(() => {
    // Mostra loading durante il caricamento iniziale
    if (authLoading || profileLoading) {
      return <Loader size="fullscreen" text="Caricamento..." />;
    }

    if (os === "web") {
      return (
        <main className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="pt-20">
            <Stack screenOptions={screenOptions}>
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="(rider)" />
            </Stack>
            {totalItems > 0 && !isAdmin && !isRider && (
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
          <Stack.Screen name="(rider)" />
        </Stack>
        {!isAdmin && !isRider && (
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
  }, [os, isOpen, totalItems, isAdmin, isRider, authLoading, profileLoading]);

  return content;
}
