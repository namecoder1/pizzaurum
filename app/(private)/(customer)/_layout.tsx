
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
  const { profile, loading: profileLoading, isAdmin } = useUserProfile();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const redirectAttempted = useRef(false);

  // Unified redirect logic to prevent race conditions and multiple redirects
  const handleRedirect = useCallback(() => {
    if (redirectAttempted.current) return;
    
    const allLoaded = !loading && !profileLoading;
    
    if (!allLoaded) return;

    // Redirect admin users to admin panel
    if (session && isAdmin === true) {
      redirectAttempted.current = true;
      printLog('CustomerLayout: Redirecting admin to admin panel');
      router.replace("/(private)/(admin)");
      return;
    }

    // Redirect non-authenticated users to public area
    if (!session) {
      redirectAttempted.current = true;
      router.replace("/(public)");
      return;
    }
  }, [loading, profileLoading, session, isAdmin, router]);

  useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

  // Reset redirect flag when user becomes customer or session changes
  useEffect(() => {
    if (!loading && !profileLoading && session && isAdmin === false) {
      redirectAttempted.current = false;
    }
  }, [loading, profileLoading, session, isAdmin]);

  // Mostra loading durante il caricamento iniziale
  if (loading || profileLoading) {
    return <Loader size="fullscreen" text="Caricamento area cliente..." />;
  }

  // Se non c'è sessione o è admin, mostra loading durante il redirect
  if (!session || isAdmin === true) {
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
      {Platform.OS !== "web" && <MobileBottomNav isAdmin={false} setIsOpen={setIsOpen} />}
    </View>
  );
}
