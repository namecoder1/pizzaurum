
import MobileBottomNav from "@/components/(private)/(customer)/mobile-bottom-nav";
import Loader from "@/components/ui/Loader";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useAuth } from "../../../contexts/auth-context";

export default function AdminLayout() {
  const { session, loading } = useAuth();
  const { profile, loading: profileLoading, isAdmin, isRider } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);  
  const router = useRouter();
  const redirectAttempted = useRef(false);

  // Unified redirect logic to prevent race conditions and multiple redirects
  const handleRedirect = useCallback(() => {
    console.log('🔍 AdminLayout Debug:', {
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

    // SECURITY: Redirect se non è esplicitamente admin
    if (!session) {
      redirectAttempted.current = true;
      console.log('🚪 No session, redirecting to public');
      router.replace("/(public)");
      return;
    }

    // SECURITY: Solo gli admin possono accedere a questa area
    if (isAdmin !== true) {
      redirectAttempted.current = true;
      console.log('⛔ User is not admin, redirecting based on role');
      
      // Redirect basato sul ruolo effettivo
      if (isRider === true || profile?.role === "driver") {
        console.log('🏍️ Redirecting rider to rider area');
        router.replace("/(private)/(rider)");
      } else if (profile?.role === "customer") {
        console.log('🛒 Redirecting customer to customer area');
        router.replace("/(private)/(customer)");
      } else {
        console.log('🚪 Unknown role, redirecting to public');
        router.replace("/(public)");
      }
      return;
    }

    console.log('✅ User is admin, staying in admin area');
  }, [loading, profileLoading, session, isAdmin, isRider, profile?.role, router]);

  useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

  // Reset redirect flag when user becomes admin
  useEffect(() => {
    if (!loading && !profileLoading && session && isAdmin === true) {
      redirectAttempted.current = false;
    }
  }, [loading, profileLoading, session, isAdmin]);

  // Mostra loading durante il caricamento iniziale
  if (loading || profileLoading) {
    return <Loader size="fullscreen" text="Verificando permessi admin..." />;
  }

  // SECURITY: Se non c'è sessione o non è esplicitamente admin, mostra loading durante il redirect
  if (!session || isAdmin !== true) {
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
        <Stack.Screen name="utenti" />
        <Stack.Screen name="analitiche" />
        <Stack.Screen name="ordini" />
        <Stack.Screen name="profilo" />
      </Stack>
      {Platform.OS !== "web" && <MobileBottomNav role="admin" setIsOpen={setIsOpen} />}
    </View>
  );
}

