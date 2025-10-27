import { useAuth } from "@/contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { router, Stack } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

export default function PublicLayout() {
  const { session, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const redirectAttempted = useRef(false);

  // Unified redirect logic for authenticated users
  const handleAuthenticatedRedirect = useCallback(() => {
    if (redirectAttempted.current || loading || profileLoading || !session || !profile) {
      return;
    }

    if (profile.role === "admin") {
      redirectAttempted.current = true;
      router.replace("/(private)/(admin)");
    } else if (profile.role === "driver") {
      redirectAttempted.current = true;
      router.replace("/(private)/(rider)");
    } else if (profile.role === "customer") {
      redirectAttempted.current = true;
      router.replace("/(private)/(customer)");
    }
  }, [loading, profileLoading, session, profile, router]);

  useEffect(() => {
    handleAuthenticatedRedirect();
  }, [handleAuthenticatedRedirect]);

  // Reset redirect flag when session ends
  useEffect(() => {
    if (!session) {
      redirectAttempted.current = false;
    }
  }, [session]);

  // Opzioni comuni per disabilitare il gesto di swipe su iOS
  const screenOptions = {
    headerShown: false,
    gestureEnabled: false, // Disabilita il gesto di swipe
    animation: 'slide_from_right' as const, // Mantiene l'animazione di transizione
  };

  // Su web mostra stack con menu, su mobile solo index
  if (Platform.OS === "web") {
    return (
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="reset-password" />
      </Stack>
    );
  }

  // Su mobile mostra solo la pagina index senza drawer
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
