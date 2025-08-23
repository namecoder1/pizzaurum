import { createClientSupabase } from "@/lib/supabase";
import { printLog } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

export function useRealtimeDebug() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const setupDebugSubscription = useCallback(async () => {
    try {
      printLog(`� Setting up debug realtime subscription...`)
      const supabase = await createClientSupabase();
      
      // Crea un canale unico per il debug
      const channelName = `debug_realtime_${Date.now()}`;
      
      const subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            printLog(`� Debug realtime event received: ${payload}`)
            setLastEvent(payload);
            setEvents(prev => [payload, ...prev.slice(0, 9)]); // Mantieni solo gli ultimi 10 eventi
          }
        )
        .subscribe((status) => {
          printLog(`� Debug subscription status: ${status}`)
          setIsConnected(status === 'SUBSCRIBED');
          
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
            printLog(`� Debug subscription connected successfully!`)
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            isSubscribedRef.current = false;
            printLog(`� Debug subscription disconnected: ${status}`)
          }
        });

      subscriptionRef.current = subscription;
      printLog(`� Debug subscription setup complete`)

      return () => {
        printLog(`� Cleaning up debug subscription...`)
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
          isSubscribedRef.current = false;
        }
      };
    } catch (error) {
      printLog(`❌ Error setting up debug subscription: ${error}`, true)
      isSubscribedRef.current = false;
      return () => {};
    }
  }, []); // Nessuna dipendenza

  useEffect(() => {
    if (isSubscribedRef.current) return;

    const cleanup = setupDebugSubscription();
    
    return () => {
      cleanup.then(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []); // Nessuna dipendenza - setup una sola volta

  // Cleanup quando il componente si smonta
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        printLog(`🔧 Component unmounting, cleaning up debug subscription...`)
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return {
    isConnected,
    lastEvent,
    events,
    clearEvents
  };
} 