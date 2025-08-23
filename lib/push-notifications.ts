import { printLog } from '@/lib/utils';

// Interfaccia per i dati dell'ordine
export interface PushNotificationData {
  orderId: string;
  status: string;
  orderNumber?: string;
  estimatedTime?: string;
  title: string;
  body: string;
}

// Funzione per inviare notifica push remote tramite Expo Push Service
export async function sendPushNotification(
  expoPushToken: string,
  data: PushNotificationData
): Promise<boolean> {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
    
    const response = await fetch(`${baseUrl}/api/push/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        title: data.title,
        body: data.body,
        data: {
          orderId: data.orderId,
          status: data.status,
          orderNumber: data.orderNumber,
          estimatedTime: data.estimatedTime,
          type: 'order_status_update',
          navigation: {
            screen: 'orders',
            params: {
              openOrderId: data.orderId
            }
          }
        },
        sound: 'default',
        priority: 'high',
        channelId: 'orders'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      printLog(`❌ Errore nell'invio notifica push: ${response.status} - ${errorData.error || 'Unknown error'}`, true);
      return false;
    }

    const result = await response.json();
    printLog(`✅ Notifica push inviata con successo: ${result.data?.status || 'success'}`);
    return true;
  } catch (error) {
    printLog(`❌ Errore nell'invio notifica push: ${error}`, true);
    return false;
  }
}

// Funzione per inviare notifica push per cambio stato ordine
export async function sendOrderStatusPushNotification(
  expoPushToken: string,
  orderData: PushNotificationData
): Promise<boolean> {
  return sendPushNotification(expoPushToken, orderData);
}

// Funzione per inviare notifica di benvenuto
export async function sendWelcomePushNotification(
  expoPushToken: string
): Promise<boolean> {
  const data: PushNotificationData = {
    orderId: '',
    status: 'welcome',
    title: 'Benvenuto su Pizzaurum! 🍕',
    body: 'Grazie per aver scaricato la nostra app. Ordina la tua pizza preferita!'
  };
  
  return sendPushNotification(expoPushToken, data);
}

// Funzione per inviare notifica promozionale
export async function sendPromotionalPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  const pushData: PushNotificationData = {
    orderId: '',
    status: 'promotional',
    title,
    body,
    ...data
  };
  
  return sendPushNotification(expoPushToken, pushData);
}
