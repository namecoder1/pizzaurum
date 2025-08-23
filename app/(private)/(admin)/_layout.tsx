
import MobileBottomNav from "@/components/(private)/(customer)/mobile-bottom-nav";
import Loader from "@/components/ui/Loader";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useAuth } from "../../../contexts/auth-context";

export default function AdminLayout() {
  const { session, loading } = useAuth();
  const { profile, loading: profileLoading, isAdmin } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);  
  const router = useRouter();
  const redirectAttempted = useRef(false);

  // Unified redirect logic to prevent race conditions and multiple redirects
  const handleRedirect = useCallback(() => {
    if (redirectAttempted.current) return;
    
    const shouldRedirect = (!loading && !profileLoading) && 
      (!session || (session && isAdmin === false));
    
    if (shouldRedirect) {
      redirectAttempted.current = true;
      router.replace("/(public)");
    }
  }, [loading, profileLoading, session, isAdmin, router]);

  useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

  // Reset redirect flag when component unmounts or user becomes admin
  useEffect(() => {
    if (!loading && !profileLoading && session && isAdmin === true) {
      redirectAttempted.current = false;
    }
  }, [loading, profileLoading, session, isAdmin]);

  // Mostra loading durante il caricamento iniziale
  if (loading || profileLoading) {
    return <Loader size="fullscreen" text="Verificando permessi admin..." />;
  }

  // Se non c'è sessione o non è admin, mostra loading durante il redirect
  if (!session || isAdmin === false) {
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
      {Platform.OS !== "web" && <MobileBottomNav isAdmin={true} setIsOpen={setIsOpen} />}
    </View>
  );
}

