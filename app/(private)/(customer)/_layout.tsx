
import MobileBottomNav from "@/components/(private)/(customer)/mobile-bottom-nav";
import MobileCart from "@/components/(private)/(customer)/mobile-cart";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { printLog } from "@/lib/utils";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";

export default function CustomerLayout() {
  const { session, loading } = useAuth();
  const { profile, loading: profileLoading, isAdmin, isRider } = useUserProfile();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const redirectAttempted = useRef(false);

  // Unified redirect logic to prevent race conditions and multiple redirects
  const handleRedirect = useCallback(() => {
    console.log('🔍 CustomerLayout Debug:', {
      redirectAttempted: redirectAttempted.current,
      loading,
      profileLoading,
      session: !!session,
      isAdmin,
      isRider,
      profileRole: profile?.role,
      allLoaded: !loading && !profileLoading
    });

    if (redirectAttempted.current) {
      console.log('🚫 Redirect already attempted, skipping');
      return;
    }
    
    const allLoaded = !loading && !profileLoading;
    
    if (!allLoaded) {
      console.log('⏳ Still loading, skipping redirect');
      return;
    }

    // SECURITY: Redirect se non c'è sessione
    if (!session) {
      redirectAttempted.current = true;
      console.log('🚪 No session, redirecting to public');
      router.replace("/(public)");
      return;
    }

    // SECURITY: Solo i customer possono accedere a questa area
    if (isAdmin === true || isRider === true) {
      redirectAttempted.current = true;
      console.log('⛔ User is admin or rider, redirecting based on role');
      printLog('CustomerLayout: User is admin or rider, redirecting');
      
      // Redirect basato sul ruolo effettivo
      if (isAdmin === true || profile?.role === "admin") {
        console.log('👑 Redirecting admin to admin panel');
        router.replace("/(private)/(admin)");
      } else if (isRider === true || profile?.role === "driver") {
        console.log('🏍️ Redirecting rider to rider panel');
        router.replace("/(private)/(rider)");
      }
      return;
    }

    console.log('✅ User is customer, staying in customer area');
  }, [loading, profileLoading, session, isAdmin, isRider, profile?.role, router]);

  useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

  // Reset redirect flag when user becomes customer
  useEffect(() => {
    if (!loading && !profileLoading && session && isAdmin === false && isRider === false) {
      redirectAttempted.current = false;
    }
  }, [loading, profileLoading, session, isAdmin, isRider]);

  // Mostra loading durante il caricamento iniziale
  if (loading || profileLoading) {
    return <Loader size="fullscreen" text="Caricamento area cliente..." />;
  }

  // SECURITY: Se non c'è sessione o è admin/rider, mostra loading durante il redirect
  if (!session || isAdmin === true || isRider === true) {
    return <Loader size="fullscreen" text="Reindirizzamento..." />;
  }

  // Opzioni comuni per disabilitare il gesto di swipe su iOS
  const screenOptions = {
    headerShown: false,
    gestureEnabled: false, // Disabilita il gesto di swipe
    animation: 'slide_from_right' as const, // Mantiene l'animazione di transizione
  };

  return (
    <View style={{ flex: 1, minHeight: '100%' }}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="checkout" />
      </Stack>
      {Platform.OS !== "web" && !isAdmin && (
        <MobileCart isOpen={isOpen} closeDialog={() => setIsOpen(false)} />
      )}
      {Platform.OS !== "web" && <MobileBottomNav role="customer" setIsOpen={setIsOpen} />}
    </View>
  );
}
