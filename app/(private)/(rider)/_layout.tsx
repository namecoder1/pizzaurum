import MobileBottomNav from "@/components/(private)/(customer)/mobile-bottom-nav";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { printLog } from "@/lib/utils";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";

export default function RiderLayout() {
  const { session, loading } = useAuth();
  const { profile, loading: profileLoading, isAdmin, isRider } = useUserProfile();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);  
  const redirectAttempted = useRef(false);
  const os = Platform.OS;

  // Unified redirect logic to prevent race conditions and multiple redirects
  const handleRedirect = useCallback(() => {
    console.log('🔍 RiderLayout Debug:', {
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

    // SECURITY: Solo i rider possono accedere a questa area
    if (isRider !== true) {
      redirectAttempted.current = true;
      console.log('⛔ User is not rider, redirecting based on role');
      printLog('RiderLayout: User is not rider, redirecting based on role');
      
      // Redirect basato sul ruolo effettivo
      if (isAdmin === true || profile?.role === "admin") {
        console.log('👑 Redirecting admin to admin panel');
        router.replace("/(private)/(admin)");
      } else if (profile?.role === "customer") {
        console.log('🛒 Redirecting customer to customer area');
        router.replace("/(private)/(customer)");
      } else {
        console.log('🚪 Unknown role, redirecting to public');
        router.replace("/(public)");
      }
      return;
    }

    console.log('✅ User is rider, staying in rider area');
    printLog('RiderLayout: User is rider, staying in rider area');
  }, [loading, profileLoading, session, isAdmin, isRider, profile?.role, router]);

  useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

  // Reset redirect flag when user becomes rider
  useEffect(() => {
    if (!loading && !profileLoading && session && isRider === true) {
      redirectAttempted.current = false;
    }
  }, [loading, profileLoading, session, isRider]);

  // Mostra loading durante il caricamento iniziale
  if (loading || profileLoading) {
    return <Loader size="fullscreen" text="Caricamento area rider..." />;
  }

  // SECURITY: Se non c'è sessione o non è esplicitamente rider, mostra loading durante il redirect
  if (!session || isRider !== true) {
    return <Loader size="fullscreen" text="Reindirizzamento..." />;
  }

  // Usa lo stesso layout per web e mobile per ora
  // if (os === "web") {
  //   return (
  //     // Layout web con sidebar - temporaneamente disabilitato
  //   );
  // }

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
        <Stack.Screen name="assigned" />
        <Stack.Screen name="completed" />
        <Stack.Screen name="earnings" />
        <Stack.Screen name="profile" />
      </Stack>
      {Platform.OS !== "web" && <MobileBottomNav role="rider" setIsOpen={setIsOpen} />}
    </View>
  );
}
