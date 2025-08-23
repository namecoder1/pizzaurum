import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurazione handler per le notifiche
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Tipi per i diversi stati degli ordini
export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'delivered' 
  | 'cancelled';

// Interfaccia per i dati dell'ordine
export interface OrderNotificationData {
  orderId: string;
  status: OrderStatus;
  orderNumber?: string;
  estimatedTime?: string;
}

// Funzione per ottenere il token delle notifiche
export async function getPushToken(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permessi notifiche non concessi');
      return null;
    }

    // Ottieni il token Expo
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'b6532ec2-cf19-4f72-bdc3-89504819876d',
    });
    
    return token.data;
  } catch (error) {
    console.error('Errore nel ottenere il push token:', error);
    return null;
  }
}

// Funzione per inviare notifica locale per cambio stato ordine
export async function sendOrderStatusNotification(
  orderData: OrderNotificationData
): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('Notifiche non supportate su web');
    return;
  }

  const { status, orderNumber, estimatedTime } = orderData;
  
  let title = '';
  let body = '';
  
  switch (status) {
    case 'confirmed':
      title = 'Ordine confermato! 🎉';
      body = `Il tuo ordine #${orderNumber} è stato confermato e verrà preparato presto.`;
      break;
    case 'preparing':
      title = 'Ordine in preparazione! 👨‍🍳';
      body = `Il tuo ordine #${orderNumber} è in preparazione.`;
      break;
    case 'ready':
      title = 'Ordine pronto! 🍕';
      body = `Il tuo ordine #${orderNumber} è pronto per il ritiro!`;
      break;
    case 'delivered':
      title = 'Ordine consegnato! ✅';
      body = `Il tuo ordine #${orderNumber} è stato consegnato. Buon appetito!`;
      break;
    case 'cancelled':
      title = 'Ordine annullato ❌';
      body = `Il tuo ordine #${orderNumber} è stato annullato.`;
      break;
    default:
      title = 'Aggiornamento ordine';
      body = `Il tuo ordine #${orderNumber} ha un nuovo stato.`;
  }

  if (estimatedTime) {
    body += ` Tempo stimato: ${estimatedTime}`;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: orderData as unknown as Record<string, unknown>,
        sound: 'default',
      },
      trigger: null, // Notifica immediata
    });
    
    console.log(`Notifica inviata per ordine #${orderNumber} - Stato: ${status}`);
  } catch (error) {
    console.error('Errore nell\'invio della notifica:', error);
  }
}

// Funzione per inviare notifica di benvenuto
export async function sendWelcomeNotification(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Benvenuto su Pizzaurum! 🍕',
        body: 'Grazie per aver scaricato la nostra app. Ordina la tua pizza preferita!',
        sound: 'default',
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Errore nell\'invio della notifica di benvenuto:', error);
  }
}

// Funzione per inviare notifica promozionale
export async function sendPromotionalNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Errore nell\'invio della notifica promozionale:', error);
  }
}

// Funzione per configurare i canali Android
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Aggiornamenti ordini',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promozioni',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }
}

// Funzione per cancellare tutte le notifiche
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Errore nella cancellazione delle notifiche:', error);
  }
}

// Funzione per ottenere le notifiche presentate
export async function getPresentedNotifications(): Promise<Notifications.Notification[]> {
  try {
    return await Notifications.getPresentedNotificationsAsync();
  } catch (error) {
    console.error('Errore nel ottenere le notifiche presentate:', error);
    return [];
  }
}
