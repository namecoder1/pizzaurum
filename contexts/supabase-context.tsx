import { resetSupabaseClient, supabaseClient } from "@/lib/supabase-manager";
import React, { createContext, useContext, useMemo } from "react";

interface SupabaseContextType {
  supabase: NonNullable<ReturnType<typeof supabaseClient>>;
  reset: () => void;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    const client = supabaseClient();
    if (!client) {
      throw new Error('Failed to initialize Supabase client');
    }
    return client;
  }, []);
  
  const reset = () => {
    resetSupabaseClient();
  };

  const value = useMemo(() => ({
    supabase,
    reset,
  }), [supabase]);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context.supabase;
}

export function useSupabaseReset() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabaseReset must be used within a SupabaseProvider');
  }
  return context.reset;
} 