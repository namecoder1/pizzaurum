import { useAuth } from "@/contexts/auth-context";
import { useSupabase } from "@/contexts/supabase-context";
import { printLog } from "@/lib/utils";
import { UserProps } from "@/types/types";
import { useEffect, useMemo, useState } from "react";

export function useUserProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabaseClient = useSupabase();

  useEffect(() => {
    if (!session?.user?.id) {
      printLog("No session user ID, clearing profile");
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        printLog(`Fetching profile for user: ${session.user.id}`);
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setError(error.message);
        } else {
          setProfile(data as unknown as UserProps);
        }
      } catch (err) {
        console.error("Error in fetchProfile:", err);
        setError("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session?.user?.id, supabaseClient]);

  // Memoizza isAdmin per evitare ricalcoli non necessari
  const isAdmin = useMemo(() => profile?.role === "admin", [profile?.role]);

  const updateProfile = async (updates: Partial<UserProps>) => {
    if (!session?.user?.id) return { error: "No session" };

    try {
      const { data, error } = await supabaseClient
        .from("users")
        .update(updates)
        .eq("id", session.user.id)
        .select()
        .single();

      if (error) {
        return { error };
      }

      setProfile(data as unknown as UserProps);
      return { data };
    } catch (err) {
      console.error("Error updating profile:", err);
      return { error: "Failed to update profile" };
    }
  };

  return {
    profile,
    loading,
    error,
    isAdmin,
    updateProfile,
    refetch: () => {
      if (session?.user?.id) {
        setLoading(true);
        // Trigger refetch by updating the dependency
        setProfile(null);
      }
    }
  };
} 