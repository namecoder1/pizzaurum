import { OpenDaysProps, ProductProps, SpianataProps, UserProps } from '@/types/types';
import { Session } from '@supabase/supabase-js';
import { CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

// Utility functions

/**
 * Merge Tailwind classes
 * @param inputs - The classes to merge
 * @returns The merged classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Print log only in development mode
 * @param message - The message to print
 * @param error - Whether the message is an error
 */
export function printLog(message: string, error: boolean = false) {
  if (process.env.NODE_ENV === "development") {
    if (error) {
      console.error(message);
    } else {
      console.log(`${format(new Date(), 'HH:mm:ss')} \n ${message}`);
    }
  }
}

// Status functions

/**
 * Get the text for a status
 * @param status - The status
 * @returns The text for the status
 */
export const statusDictionary: Record<string, string> = {
  "pending": "In Attesa",
  "accepted": "Accettato", 
  "confirmed": "Confermato",
  "in_preparation": "In Preparazione",
  "ready": "Pronto",
  "ready_to_pickup": "Pronto per Ritiro",
  "not_picked_up": "Non Ritirato",
  "delivering": "In Consegna",
  "delivered": "Consegnato",
  "completed": "Completato",
  "cancelled": "Annullato",
  "reopened": "Riaperto",
  "reported": "Segnalato"
};

/**
 * Get the color for a status
 * @param status - The status
 * @returns The color for the status
 */
export const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-300 text-yellow-800";
    case "accepted":
      return "bg-blue-300 text-blue-800";
    case "confirmed":
      return "bg-blue-300 text-blue-800";
    case "in_preparation":
      return "bg-orange-300 text-orange-800";
    case "ready":
      return "bg-green-300 text-green-800";
    case "ready_to_pickup":
      return "bg-orange-300 text-orange-800";
    case "not_picked_up":
      return "bg-red-300 text-red-800";
    case "delivering":
      return "bg-orange-300 text-orange-800";
    case "delivered":
      return "bg-green-300 text-green-800";
    case "completed":
      return "bg-green-300 text-green-800";
    case "cancelled":
      return "bg-red-300 text-red-800";
    case "reopened":
      return "bg-blue-300 text-blue-800";
    case "reported":
      return "bg-orange-300 text-orange-800";
    default:
      return "bg-gray-300 text-gray-800";
  }
};

/**
 * Get the text for a status
 * @param status - The status
 * @returns The text for the status
 */
export const getStatusText = (status: string) => {
  switch (status) {
    case "pending":
      return "In Attesa";
    case "accepted":
      return "Accettato";
    case "confirmed":
      return "Confermato";
    case "in_preparation":
      return "In Preparazione";
    case "ready":
      return "Pronto";
    case "ready_to_pickup":
      return "Pronto per Ritiro";
    case "not_picked_up":
      return "Non Ritirato";
    case "delivering":
      return "In Consegna";
    case "delivered":
      return "Consegnato";
    case "completed":
      return "Completato";
    case "cancelled":
      return "Annullato";
    case "reopened":
      return "Riaperto";
    case "reported":
      return "Segnalato";
    default:
      return status;
  }
};

/**
 * Get the icon for a status
 * @param status - The status
 * @returns The icon for the status
 */
export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-6 h-6 text-green-500" size={16} />;
    case 'pending':
      return <Clock className="w-6 h-6 text-yellow-500" size={16} />
    case 'failed':
      return <XCircle className="w-6 h-6 text-red-500" size={16} />;
    default:
      return <Clock className="w-6 h-6 text-gray-500" size={16} />
  }
};

/**
 * Get the text for the next status button
 * @param status - The current status
 * @param isDelivery - Whether the order is a delivery
 * @returns The text for the next status button
 */
export const getNextStatusButtonText = (status: string, isDelivery: boolean) => {
  // Flusso per ordini di consegna
  const deliveryFlow = [
    { status: 'pending', nextText: 'Accetta' },
    { status: 'accepted', nextText: 'In Preparazione' },
    { status: 'in_preparation', nextText: 'In Consegna' },
    { status: 'delivering', nextText: 'Consegnato' },
    { status: 'delivered', nextText: 'Completato' }
  ];

  // Flusso per ordini di ritiro
  const pickupFlow = [
    { status: 'pending', nextText: 'Accetta' },
    { status: 'accepted', nextText: 'In Preparazione' },
    { status: 'in_preparation', nextText: 'Pronto per Ritiro' },
    { status: 'ready_to_pickup', nextText: 'Completato' }
  ];

  const flow = isDelivery ? deliveryFlow : pickupFlow;
  const currentStep = flow.find(step => step.status === status);
  
  if (status === 'cancelled') {
    return 'Riapri Ordine';
  }
  
  if (status === 'completed') {
    return null; // Non mostrare bottone per ordini completati
  }

  return currentStep?.nextText || null;
};

/**
 * Get the initials of a name
 * @param name - The name
 * @returns The initials of the name
 */
export const getInitials = (name: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

// Stripe functions

// Format amount for Stripe
export function formatAmountForStripe(amount: number, currency?: string) {
  // Default to EUR if no currency is provided
  const safeCurrency = currency || 'EUR';
  
  // Stripe expects amounts in the smallest currency unit (cents for EUR, USD, etc.)
  // For zero-decimal currencies like JPY, we don't multiply by 100
  const zeroDecimalCurrencies = ['JPY', 'BIF', 'CLP', 'DJF', 'GNF', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
  
  try {
    if (zeroDecimalCurrencies.includes(safeCurrency.toUpperCase())) {
      return Math.round(amount);
    }
    
    // For currencies with decimals (EUR, USD, etc.), convert to cents
    return Math.round(amount * 100);
  } catch (error) {
    console.error('Error formatting amount for Stripe:', { amount, currency: safeCurrency, error });
    // Fallback to EUR conversion
    return Math.round(amount * 100);
  }
}

/**
 * Get payment method name
 * @param paymentMethod - The payment method
 * @returns The payment method name
 */
export function getPaymentMethodName(paymentMethod: string): string {
  if (!paymentMethod) return '';
  if (paymentMethod == 'card') return 'Carta';
  if (paymentMethod === 'bank_transfer') return 'Bonifico';
  if (paymentMethod === 'paypal') return 'PayPal';
  if (paymentMethod === 'satispay') return 'Satispay';
  if (paymentMethod === 'revolut_pay') return 'Revout';
  if (paymentMethod === 'apple_pay') return 'Apple Pay';
  if (paymentMethod === 'google_pay') return 'Google Pay';
  return 'Altro';
}

// Product functions

/**
 * Get the type of a product
 * @param product - The product
 * @returns The type of the product
 */
export const getProductType = (product: ProductProps | SpianataProps): string => {
  if ('spianata' in product) {
    return 'spianata'
  }
  
  switch (product.type) {
    case 'pizza':
      return 'Pizza'
    case 'pizzaurum':
      return 'Pizzaurum'
    case 'drink':
      return 'Bevanda'
    case 'other':
      return 'Altro'
    default:
      return 'Prodotto'
  }
}

/**
 * Cleans product names by removing invisible Unicode characters
 * @param name - The product name to clean
 * @returns The cleaned product name
 */
export function cleanProductName(name: string): string {
  if (!name) return name;
  
  // More aggressive cleaning - remove all invisible Unicode characters
  // This includes zero-width spaces, bidirectional marks, and other invisible characters
  const cleaned = name
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F]/g, '') // Standard invisible chars
    .replace(/[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180D\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g, '') // Extended invisible chars
    .replace(/[\u2066\u2067\u2068\u2069]/g, '') // Additional bidirectional marks
    .trim(); // Remove leading/trailing whitespace
  
  return cleaned;
}

/**
 * Alternative cleaning function that removes all non-printable characters
 * @param name - The product name to clean
 * @returns The cleaned product name
 */
export function cleanProductNameAggressive(name: string): string {
  if (!name) return name;
  
  // Remove all characters that are not printable or are control characters
  const cleaned = name
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      // Keep printable characters (32-126) and some extended characters
      return code >= 32 && code <= 126 || 
             code >= 160 && code <= 255 ||
             code >= 0x0100 && code <= 0x017F; // Latin Extended-A
    })
    .join('')
    .trim();
  
  return cleaned;
}

// Date functions

/**
 * Format date to Italian format (dd/MM/yyyy)
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDateItalian(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format date with time to Italian format (dd/MM/yyyy HH:mm)
 * @param date - Date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTimeItalian(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return '';
  }
}

/**
 * Get formatted weekday
 * @param day - The day of the week
 * @returns The formatted weekday
 */
export function getFormattedWeekday(day: string): string {
  if (day == 'monday') return 'Lunedì';
  if (day == 'tuesday') return 'Martedì';
  if (day == 'wednesday') return 'Mercoledì';
  if (day == 'thursday') return 'Giovedì';
  if (day == 'friday') return 'Venerdì';
  if (day == 'saturday') return 'Sabato';
  if (day == 'sunday') return 'Domenica';
  return '';
}


/**
 * Group days by schedule
 * @param days - The days to group
 * @returns The grouped days
 */
export function groupDaysBySchedule(openDays: OpenDaysProps[]): {
  days: string[],
  schedule: string,
  isOpen: boolean,
  startDay: string
}[] {
  if (!openDays || openDays.length === 0) return [];
  
  const groups: {
    days: string[],
    schedule: string,
    isOpen: boolean,
    startDay: string
  }[] = [];
  let currentGroup: {
    days: string[],
    schedule: string,
    isOpen: boolean,
    startDay: string
  } | null = null;
  
  // Ordina i giorni per ordine della settimana
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sortedDays = openDays.sort((a, b) => {
    const aClean = a.day?.replace(/[^\w]/g, '').toLowerCase();
    const bClean = b.day?.replace(/[^\w]/g, '').toLowerCase();
    return dayOrder.indexOf(aClean) - dayOrder.indexOf(bClean);
  });
  
  sortedDays.forEach((day) => {
    const cleanDay = day.day?.replace(/[^\w]/g, '').toLowerCase();
    const formattedDay = getFormattedWeekday(cleanDay);
    const rawSchedule = day.timeSlots?.map((slot) => slot.openTime + " - " + slot.closeTime).join(", ") || "Chiuso";
    const schedule = rawSchedule.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    const isOpen = day.isOpen && day.timeSlots && day.timeSlots.length > 0;
    
    
    if (!currentGroup || 
        currentGroup.schedule !== schedule || 
        currentGroup.isOpen !== isOpen) {
      // Nuovo gruppo
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        days: [formattedDay],
        schedule,
        isOpen,
        startDay: cleanDay
      };
    } else {
      // Aggiungi al gruppo corrente
      currentGroup.days.push(formattedDay);
    }
  });
  
  if (currentGroup) {
    groups.push(currentGroup);
  }
  
  return groups;
};

// Report functions

/**
 * Map report categories to Italian
 * @param category - The category to map
 * @returns The mapped category
 */
export function mapReportCategoryToItalian(category: string): string {
  if (category === 'fake_data') return 'Dati falsi';
  if (category === 'spam_orders') return 'Spam di ordini';
  if (category === 'suspicious_user') return 'Utente sospetto';
  if (category === 'payment_fraud') return 'Frode di pagamento';
  return 'Altro';
}

// User functions

/**
 * Check if the user is the same as the session user
 * @param id - The id of the user
 * @param session - The session
 * @returns true if the user is the same as the session user, false otherwise
 */
export const checkIsUser = (id: string, session: Session | null) => {
  if (session?.user.id === id) {
    return true
  }
  return false
}