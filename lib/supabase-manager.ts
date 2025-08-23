import { config } from '@/utils/config'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = config.supabase.url!
const supabaseAnonKey = config.supabase.anonKey!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials')
}

// Configurazione comune per tutti i client
const commonConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
}

// Chiavi uniche per evitare conflitti di storage
const CLIENT_STORAGE_KEY = 'supabase-client-session';
const ADMIN_STORAGE_KEY = 'supabase-admin-session';

// Storage wrapper per AsyncStorage con chiavi uniche
const createAsyncStorage = (storageKey: string) => ({
  getItem: (key: string) => AsyncStorage.getItem(`${storageKey}:${key}`),
  setItem: (key: string, value: string) => AsyncStorage.setItem(`${storageKey}:${key}`, value),
  removeItem: (key: string) => AsyncStorage.removeItem(`${storageKey}:${key}`),
});

// Configurazione storage per web con chiavi uniche
const createWebStorage = (storageKey: string) => ({
  getItem: (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Promise.resolve(localStorage.getItem(`${storageKey}:${key}`))
      }
      return Promise.resolve(null)
    } catch (error) {
      return Promise.resolve(null)
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`${storageKey}:${key}`, value)
      }
      return Promise.resolve()
    } catch (error) {
      return Promise.resolve()
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`${storageKey}:${key}`)
      }
      return Promise.resolve()
    } catch (error) {
      return Promise.resolve()
    }
  },
})

// Manager centralizzato per tutti i client Supabase
class SupabaseManager {
  private static clientInstance: ReturnType<typeof createClient> | null = null;
  private static adminInstance: ReturnType<typeof createClient> | null = null;
  private static isInitializingClient = false;
  private static isInitializingAdmin = false;

  // Client normale (anon key)
  static getClient(): ReturnType<typeof createClient> {
    if (this.clientInstance) {
      return this.clientInstance;
    }

    if (this.isInitializingClient) {
      // Se stiamo già inizializzando, crea una nuova istanza per evitare deadlock
      // Questo è un fallback per evitare errori, ma dovrebbe essere raro
      console.warn('Supabase client is being initialized, creating fallback instance');
      return this.createClientInstanceSync();
    }

    this.isInitializingClient = true;

    try {
      this.clientInstance = this.createClientInstanceSync();
      return this.clientInstance;
    } finally {
      this.isInitializingClient = false;
    }
  }

  private static createClientInstanceSync(): ReturnType<typeof createClient> {
    // Determina l'ambiente in modo sicuro
    const isWeb = Platform.OS === 'web';
    const hasWindow = typeof window !== 'undefined';
    
    if (isWeb && hasWindow) {
      // Ambiente web con window disponibile
      return createClient(supabaseUrl, supabaseAnonKey, {
        ...commonConfig,
        auth: {
          ...commonConfig.auth,
          storage: createWebStorage(CLIENT_STORAGE_KEY),
        },
      });
    } else if (isWeb && !hasWindow) {
      // Ambiente web server-side (SSR)
      return createClient(supabaseUrl, supabaseAnonKey, {
        ...commonConfig,
        auth: {
          ...commonConfig.auth,
          storage: {
            getItem: () => Promise.resolve(null),
            setItem: () => Promise.resolve(),
            removeItem: () => Promise.resolve(),
          },
        },
      });
    } else {
      // Ambiente mobile
      return createClient(supabaseUrl, supabaseAnonKey, {
        ...commonConfig,
        auth: {
          ...commonConfig.auth,
          storage: createAsyncStorage(CLIENT_STORAGE_KEY),
        },
      });
    }
  }

  // Client admin (service role key) - disponibile solo lato server
  static getAdminClient(): ReturnType<typeof createClient> | null {
    // Controlla se siamo lato server
    const isServer = typeof window === 'undefined';
    
    if (!isServer) {
      console.warn('⚠️ getAdminClient() called from client-side. Admin operations should be performed server-side.');
      return null;
    }

    if (this.adminInstance) {
      return this.adminInstance;
    }

    if (this.isInitializingAdmin) {
      console.warn('Supabase admin client is being initialized, creating fallback instance');
      return this.createAdminInstanceSync();
    }

    this.isInitializingAdmin = true;

    try {
      this.adminInstance = this.createAdminInstanceSync();
      return this.adminInstance;
    } finally {
      this.isInitializingAdmin = false;
    }
  }

  private static createAdminInstanceSync(): ReturnType<typeof createClient> | null {
    // Controlla se siamo lato server
    const isServer = typeof window === 'undefined';
    
    if (!isServer) {
      return null;
    }

    // Ottieni la service role key dalle variabili d'ambiente
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing! Cannot initialize admin client.');
      return null;
    }

    // Crea il client admin con la service role key
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  }

  // Reset di tutti i client (utile per logout/testing)
  static reset() {
    this.clientInstance = null;
    this.adminInstance = null;
    this.isInitializingClient = false;
    this.isInitializingAdmin = false;
  }

  // Reset solo del client normale
  static resetClient() {
    this.clientInstance = null;
    this.isInitializingClient = false;
  }

  // Reset solo del client admin
  static resetAdmin() {
    this.adminInstance = null;
    this.isInitializingAdmin = false;
  }
}

// Esporta le funzioni per compatibilità
export const createClientSupabase = (): ReturnType<typeof createClient> => {
  return SupabaseManager.getClient();
};

export const createAdminSupabase = (): ReturnType<typeof createClient> | null => {
  return SupabaseManager.getAdminClient();
};

export const resetSupabaseClient = () => {
  SupabaseManager.reset();
};

export const resetSupabaseAdmin = () => {
  SupabaseManager.resetAdmin();
};

// Esporta le funzioni per ottenere le istanze (lazy initialization)
export const getSupabaseClient = () => SupabaseManager.getClient();
export const getSupabaseAdmin = () => SupabaseManager.getAdminClient();

// Esporta le istanze con inizializzazione lazy
let supabaseClient: ReturnType<typeof createClient> | null = null;
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

// Funzioni per ottenere le istanze con inizializzazione lazy
const getClientInstance = () => {
  if (!supabaseClient) {
    try {
      supabaseClient = SupabaseManager.getClient();
    } catch (error) {
      console.warn('Failed to initialize Supabase client:', error);
      return null;
    }
  }
  return supabaseClient;
};

const getAdminInstance = () => {
  if (!supabaseAdmin) {
    try {
      supabaseAdmin = SupabaseManager.getAdminClient();
    } catch (error) {
      console.warn('Failed to initialize Supabase admin client:', error);
      return null;
    }
  }
  return supabaseAdmin;
};

// Esporta le funzioni per accesso sicuro
export { getAdminInstance as supabaseAdmin, getClientInstance as supabaseClient }

// Hook per React (da usare nei componenti)
export const useSupabaseClient = () => {
  return getClientInstance();
};

export const useSupabaseAdmin = () => {
  return getAdminInstance();
};

