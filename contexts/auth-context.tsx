import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { printLog } from "@/lib/utils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useSupabase, useSupabaseReset } from "./supabase-context";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  saveCurrentRoute: (route: string) => Promise<void>;
  getSavedRoute: () => Promise<string | null>;
  clearSavedRoute: () => Promise<void>;
  deleteUser: (userId: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  authLoading: false,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  signUp: async () => ({ error: null }),
  saveCurrentRoute: async () => {},
  getSavedRoute: async () => null,
  clearSavedRoute: async () => {},
  deleteUser: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Usa una singola istanza del client
  const supabaseClient = useSupabase();
  const resetSupabase = useSupabaseReset();

  // Funzione helper per pulire il storage su entrambe le piattaforme
  const clearAuthStorage = useCallback(async () => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        // Pulisci tutte le chiavi che potrebbero contenere dati di autenticazione
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("sb-") || 
            key.includes("supabase") || 
            key.includes("auth") ||
            key.includes("session") ||
            key.includes("token")
          ) {
            localStorage.removeItem(key);
          }
        });
        
        // Pulisci anche sessionStorage
        Object.keys(sessionStorage).forEach((key) => {
          if (
            key.startsWith("sb-") || 
            key.includes("supabase") || 
            key.includes("auth") ||
            key.includes("session") ||
            key.includes("token")
          ) {
            sessionStorage.removeItem(key);
          }
        });
      } else {
        const allKeys = await AsyncStorage.getAllKeys();
        const authKeys = allKeys.filter(
          (key) => 
            key.startsWith("sb-") || 
            key.includes("supabase") ||
            key.includes("auth") ||
            key.includes("session") ||
            key.includes("token")
        );
        if (authKeys.length > 0) {
          await AsyncStorage.multiRemove(authKeys);
        }
      }
    } catch (storageError) {
      printLog(`❌ Error clearing auth storage: ${storageError}`, true)
    }
  }, []);

  const saveCurrentRoute = useCallback(async (route: string) => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        localStorage.setItem('currentRoute', route);
      } else {
        await AsyncStorage.setItem('currentRoute', route);
      }
    } catch (error) {
      printLog(`❌ Error saving route: ${error}`, true)
    }
  }, []);

  const getSavedRoute = useCallback(async (): Promise<string | null> => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        return localStorage.getItem('currentRoute');
      } else {
        return await AsyncStorage.getItem('currentRoute');
      }
    } catch (error) {
      printLog(`❌ Error getting saved route: ${error}`, true)
      return null;
    }
  }, []);

  const clearSavedRoute = useCallback(async () => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        localStorage.removeItem('currentRoute');
      } else {
        await AsyncStorage.removeItem('currentRoute');
      }
    } catch (error) {
      printLog(`❌ Error clearing saved route: ${error}`, true)
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthLoading(true);
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setAuthLoading(false);
    }
    return { error };
  }, [supabaseClient]);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthLoading(true);
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    if (error) {
      setAuthLoading(false);
      return { error };
    }
    setAuthLoading(false);
    return { error: null };
  }, [supabaseClient]);

  const signOut = useCallback(async () => {
    setAuthLoading(true);
    try {
      // Prima pulisci il storage locale
      await clearAuthStorage();
      
      // Poi fai il signOut da Supabase
      const { error } = await supabaseClient.auth.signOut();

      if (error && error.message !== "Auth session missing!") {
        printLog(`❌ Error signing out: ${error}`, true)
        // Se c'è un errore, pulisci comunque il storage
        await clearAuthStorage();
      }

      // Pulisci la route salvata
      await clearSavedRoute();
      
      // Reset del client Supabase per evitare problemi con multiple istanze
      resetSupabase();
      
      // Imposta la sessione a null
      setSession(null);
      
    } catch (error: any) {
      printLog(`❌ Unexpected error during sign out: ${error}`, true)
      // In caso di errore, pulisci comunque tutto
      await clearAuthStorage();
      await clearSavedRoute();
      setSession(null);
      resetSupabase();
    } finally {
      setAuthLoading(false);
    }
  }, [supabaseClient, clearAuthStorage, clearSavedRoute, resetSupabase]);

  const deleteUser = useCallback(async (userId: string) => {
    setAuthLoading(true);
    try {
      
      // Usa il client normale per eliminare l'utente dalla tabella users
      const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        printLog(`❌ Error deleting user from users table: ${error}`, true)
        setAuthLoading(false);
        return { error };
      }
      
      printLog(`✅ User deleted successfully from users table: ${userId}`)
      
      // Se l'utente eliminato è quello corrente, fai logout
      if (session?.user?.id === userId) {
        await clearAuthStorage();
        await clearSavedRoute();
        resetSupabase();
        setSession(null);
      }
      
      setAuthLoading(false);
      return { error: null };
    } catch (error) {
      printLog(`❌ Unexpected error deleting user: ${error}`, true)
      setAuthLoading(false);
      return { error };
    }
  }, [supabaseClient, session, clearAuthStorage, clearSavedRoute, resetSupabase]);


  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        printLog("Initializing auth...");
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (mounted) {
          if (error) {
            printLog(`❌ Error getting session: ${error}`, true)
            setSession(null);
          } else {
            printLog(`Session loaded: ${session ? "valid" : "null"}`);
            setSession(session);
          }
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          printLog(`❌ Error initializing auth: ${error}`, true)
          setSession(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      printLog(`Auth state change: ${event} ${session ? "valid" : "null"}`);
      
      if (mounted) {
        setSession(session);
        setLoading(false);

        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          setAuthLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const contextValue = useMemo(() => ({
    session,
    loading,
    authLoading,
    signIn,
    signOut,
    signUp,
    saveCurrentRoute,
    getSavedRoute,
    clearSavedRoute,
    deleteUser,
  }), [
    session,
    loading,
    authLoading,
    signIn,
    signOut,
    signUp,
    saveCurrentRoute,
    getSavedRoute,
    clearSavedRoute,
    deleteUser,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <LoadingOverlay
        visible={authLoading}
        text="Autenticazione in corso..."
        transparent={false}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
