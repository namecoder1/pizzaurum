import {
  OrderNotificationData,
  OrderStatus,
  sendOrderStatusNotification,
  setupNotificationChannels
} from '@/lib/notifications';
import { printLog } from '@/lib/utils';
import { OrderProps } from '@/types/types';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface UseOrderNotificationsOptions {
  enabled?: boolean;
  userId?: string;
}

export function useOrderNotifications(options: UseOrderNotificationsOptions = {}) {
  const { enabled = true, userId } = options;
  const lastNotificationRef = useRef<Map<string, OrderStatus>>(new Map());

  // Setup canali di notifica all'inizializzazione
  useEffect(() => {
    if (enabled && Platform.OS !== 'web') {
      setupNotificationChannels();
    }
  }, [enabled]);

  // Funzione per mappare gli stati degli ordini del database agli stati delle notifiche
  const mapOrderStatusToNotificationStatus = (status: OrderProps['status']): OrderStatus | null => {
    switch (status) {
      case 'pending':
        return 'confirmed';
      case 'accepted':
        return 'confirmed';
      case 'preparing':
        return 'preparing';
      case 'ready_to_pickup':
        return 'ready';
      case 'delivering':
        return 'preparing';
      case 'delivered':
        return 'delivered';
      case 'completed':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      case 'failed':
        return 'cancelled';
      default:
        return null;
    }
  };

  // Funzione per inviare notifica per cambio stato ordine
  const sendOrderStatusChangeNotification = async (order: OrderProps) => {
    if (!enabled || Platform.OS === 'web' || !userId) {
      return;
    }

    // Verifica che l'ordine appartenga all'utente corrente
    if (order.user_id !== userId) {
      return;
    }

    const notificationStatus = mapOrderStatusToNotificationStatus(order.status);
    if (!notificationStatus) {
      return;
    }

    // Verifica se abbiamo già inviato una notifica per questo stato
    const lastStatus = lastNotificationRef.current.get(order.id);
    if (lastStatus === notificationStatus) {
      printLog(`📱 Notifica già inviata per ordine ${order.id} - Stato: ${notificationStatus}`);
      return;
    }

    // Aggiungi un piccolo delay per assicurarci che il database sia aggiornato
    await new Promise(resolve => setTimeout(resolve, 100));

    // Prepara i dati per la notifica
    const orderData: OrderNotificationData = {
      orderId: order.id,
      status: notificationStatus,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
    };

    // Aggiungi tempo stimato se disponibile
    if (order.estimated_delivery_time) {
      const estimatedTime = new Date(order.estimated_delivery_time);
      const now = new Date();
      const diffMinutes = Math.round((estimatedTime.getTime() - now.getTime()) / (1000 * 60));
      
      if (diffMinutes > 0) {
        orderData.estimatedTime = `${diffMinutes} minuti`;
      }
    }

    try {
      await sendOrderStatusNotification(orderData);
      
      // Aggiorna lo stato dell'ultima notifica inviata
      lastNotificationRef.current.set(order.id, notificationStatus);
      
      printLog(`📱 Notifica inviata per ordine ${order.id} - Stato: ${notificationStatus}`);
    } catch (error) {
      printLog(`❌ Errore nell'invio della notifica per ordine ${order.id}: ${error}`, true);
    }
  };

  // Hook per gestire gli aggiornamenti degli ordini
  const handleOrderUpdate = (updatedOrder: OrderProps) => {
    sendOrderStatusChangeNotification(updatedOrder);
  };

  // Hook per gestire i nuovi ordini
  const handleOrderInsert = (newOrder: OrderProps) => {
    // Per i nuovi ordini, invia notifica solo se lo stato è diverso da 'pending'
    if (newOrder.status !== 'pending') {
      sendOrderStatusChangeNotification(newOrder);
    }
  };

  // Funzione per pulire le notifiche quando l'ordine viene eliminato
  const handleOrderDelete = (orderId: string) => {
    lastNotificationRef.current.delete(orderId);
  };

  // Funzione per forzare l'invio di una notifica per un ordine specifico
  const forceNotificationForOrder = async (order: OrderProps) => {
    await sendOrderStatusChangeNotification(order);
  };

  // Funzione per pulire tutte le notifiche
  const clearNotificationHistory = () => {
    lastNotificationRef.current.clear();
  };

  return {
    handleOrderUpdate,
    handleOrderInsert,
    handleOrderDelete,
    forceNotificationForOrder,
    clearNotificationHistory,
  };
}
