import { createClientSupabase } from "@/lib/supabase";
import { printLog } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
  table: string;
  schema: string;
}

interface UseRealtimeSubscriptionOptions<T = any> {
  table: string;
  schema?: string;
  enabled?: boolean;
  filter?: string;
  onInsert?: (record: T) => void;
  onUpdate?: (record: T) => void;
  onDelete?: (record: T) => void;
  onError?: (error: any) => void;
}

export function useRealtimeSubscription<T = any>(options: UseRealtimeSubscriptionOptions<T>) {
  const { 
    table, 
    schema = 'public',
    enabled = true, 
    filter,
    onInsert, 
    onUpdate, 
    onDelete,
    onError 
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimePayload<T> | null>(null);
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  // Usa useCallback per evitare ricreazioni delle funzioni
  const handleInsert = useCallback((record: T) => {
    setLastEvent({
      eventType: 'INSERT',
      new: record,
      table,
      schema
    });
    onInsert?.(record);
  }, [onInsert, table, schema]);

  const handleUpdate = useCallback((record: T) => {
    setLastEvent({
      eventType: 'UPDATE',
      new: record,
      table,
      schema
    });
    onUpdate?.(record);
  }, [onUpdate, table, schema]);

  const handleDelete = useCallback((record: T) => {
    setLastEvent({
      eventType: 'DELETE',
      old: record,
      table,
      schema
    });
    onDelete?.(record);
  }, [onDelete, table, schema]);

  const handleError = useCallback((error: any) => {
    console.error(`Realtime ${table} error:`, error);
    onError?.(error);
  }, [onError, table]);

  useEffect(() => {
    if (!enabled || isSubscribedRef.current) return;

    const setupSubscription = async () => {
      try {
        printLog(`🟡 Setting up realtime subscription for ${table}...`);
        const supabase = await createClientSupabase();
        
        // Crea un canale unico per evitare conflitti
        const channelName = `${table}_realtime_${Date.now()}`;
        
        const channel = supabase.channel(channelName);
        
        // Configura la subscription per i cambiamenti della tabella
        channel.on(
          'postgres_changes' as any,
          {
            event: '*',
            schema,
            table,
            filter
          },
          (payload: RealtimePayload<T>) => {
            printLog(`🟡 Realtime ${table} change: ${payload}`)
            
            if (payload.eventType === 'INSERT' && payload.new) {
              handleInsert(payload.new);
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              handleUpdate(payload.new);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              handleDelete(payload.old);
            }
          }
        );

        // Sottoscrive al canale
        const subscription = channel.subscribe((status) => {
          printLog(`🟡 Realtime ${table} subscription status: ${status}`)
          setIsConnected(status === 'SUBSCRIBED');
          
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            isSubscribedRef.current = false;
            if (status === 'CHANNEL_ERROR') {
              handleError(new Error(`Failed to subscribe to ${table} realtime`));
            }
          }
        });

        subscriptionRef.current = subscription;
        printLog(`🟡 Realtime ${table} subscription setup complete`)

        return () => {
          printLog(`🟡 Cleaning up realtime subscription for ${table}...`)
          if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
            isSubscribedRef.current = false;
          }
        };
      } catch (error) {
        printLog(`❌ Error setting up realtime subscription for ${table}: ${error}`, true)
        isSubscribedRef.current = false;
        handleError(error);
        return () => {};
      }
    };

    const cleanup = setupSubscription();
    
    return () => {
      cleanup.then(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, [enabled, table, schema, filter]); // Rimuovi le dipendenze che causano re-render

  // Cleanup quando il componente si smonta
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        printLog(`🟡 Component unmounting, cleaning up ${table} subscription...`)
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [table]);

  return {
    isConnected,
    lastEvent
  };
} 