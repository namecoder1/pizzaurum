// Configurazioni per ottimizzare le performance dell'app

// Import statici delle immagini per il preloading
import heroImg from '../assets/images/hero.jpg';
import logo from '../assets/images/logo.png';

// Configurazione per il debounce delle query
export const DEBOUNCE_DELAY = 300; // ms

// Configurazione per il cache delle immagini
export const IMAGE_CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
  maxSize: 50 * 1024 * 1024, // 50MB
};

// Configurazione per le animazioni
export const ANIMATION_CONFIG = {
  fast: 200,
  normal: 300,
  slow: 500,
};

// Configurazione per il lazy loading
export const LAZY_LOADING_CONFIG = {
  threshold: 0.1, // Carica quando l'elemento è al 10% della viewport
  rootMargin: '50px', // Margine di 50px
};

// Configurazione per il cache delle query
export const QUERY_CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 minuti
  authTTL: 10 * 60 * 1000, // 10 minuti per dati di autenticazione
  userProfileTTL: 15 * 60 * 1000, // 15 minuti per profilo utente
  menuTTL: 30 * 60 * 1000, // 30 minuti per menu
};

// Configurazione per il preloading
export const PRELOAD_CONFIG = {
  // Precarica le pagine principali
  mainRoutes: ['/(public)', '/(private)/(customer)', '/(private)/(admin)'],
  // Precarica le immagini principali
  mainImages: ['/assets/images/logo.png', '/assets/images/hero.jpg'],
  // Precarica i font
  fonts: true,
  // Precarica le risorse critiche
  criticalResources: true,
};

// Funzione per ottimizzare le immagini
export const optimizeImageUrl = (url: string, width: number = 800): string => {
  if (!url) return url;
  
  // Se è già un'immagine ottimizzata, ritorna l'URL originale
  if (url.includes('w=') || url.includes('width=')) {
    return url;
  }
  
  // Aggiungi parametri di ottimizzazione per Sanity
  if (url.includes('cdn.sanity.io')) {
    try {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}w=${width}&h=${width}&fit=crop&auto=format`;
    } catch (error) {
      console.warn('Error optimizing image URL:', error);
      return url; // Fallback to original URL
    }
  }
  
  return url;
};

// Funzione per debounce
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Funzione per throttle
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Helper per estrarre l'URI da un oggetto immagine o restituire la stringa
const getImageUri = (imageSource: any): string | null => {
  if (typeof imageSource === 'string') {
    return imageSource;
  }
  if (imageSource && typeof imageSource === 'object' && imageSource.uri) {
    return imageSource.uri;
  }
  return null;
};

// Funzione per preload delle risorse
export const preloadResources = async () => {
  try {
    // Estrai gli URI dalle immagini
    const logoUri = getImageUri(logo);
    const heroUri = getImageUri(heroImg);
    
    // Per l'ambiente web, usa preloading HTML nativo
    if (typeof window !== "undefined") {
      const preloadImage = (src: string) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      };
      
      if (logoUri) {
        preloadImage(logoUri);
      }
      
      if (heroUri) {
        preloadImage(heroUri);
      }
      
      return Promise.resolve();
    }
    
    // Ambiente nativo - usa expo-image
    const { Image } = await import('expo-image');
    
    // Precarica il logo
    if (logoUri) {
      await Image.prefetch(logoUri);
    }
    
    // Precarica altre immagini critiche se necessario
    if (heroUri) {
      try {
        await Image.prefetch(heroUri);
      } catch (error) {
        console.warn('Could not preload hero image:', error);
      }
    }
    
    // Aggiungi un piccolo delay per assicurarsi che le immagini siano completamente caricate
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return Promise.resolve();
  } catch (error) {
    console.warn('Error preloading resources:', error);
    return Promise.resolve();
  }
};

// Funzione per gestire la persistenza dello stato
export const persistState = async (key: string, data: any) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.warn('Error persisting state:', error);
  }
};

// Funzione per recuperare lo stato persistito
export const getPersistedState = async (key: string) => {
  try {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
  } catch (error) {
    console.warn('Error getting persisted state:', error);
  }
  return null;
};

// Funzione per pulire lo stato persistito
export const clearPersistedState = async (key: string) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Error clearing persisted state:', error);
  }
};

// Configurazione per la gestione degli errori
export const ERROR_HANDLING_CONFIG = {
  // Retry automatico per errori di rete
  autoRetry: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000, // 1 secondo
  },
  // Timeout per le richieste
  timeout: 10000, // 10 secondi
  // Gestione errori offline
  offlineHandling: true,
};

// Funzione per retry automatico
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // Aspetta prima del retry
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw lastError!;
}; 