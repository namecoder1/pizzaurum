import { printLog } from '@/lib/utils';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface UseNotificationNavigationProps {
  onOrderNotificationTap?: (orderId: string) => void;
}

export const useNotificationNavigation = ({ onOrderNotificationTap }: UseNotificationNavigationProps) => {
  const router = useRouter();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Gestisce le notifiche ricevute quando l'app è in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      printLog(`📱 Notification received: ${notification.request.content.title}`);
    });

    // Gestisce il tap sulle notifiche
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      printLog(`📱 Notification tapped: ${JSON.stringify(data)}`);

      // Controlla se è una notifica di cambio stato ordine
      if (data?.type === 'order_status_update' && data?.orderId) {
        const orderId = data.orderId;
        printLog(`📱 Order status notification tapped for order: ${orderId}`);

        if (Platform.OS === 'web') {
          // Su web, naviga alla pagina ordini
          router.push('/orders');
        } else {
          // Su mobile, naviga alla pagina ordini e apri il bottom sheet
          router.push({
            pathname: '/orders',
            params: {
              openOrderId: orderId
            }
          });
        }

        // Chiama la callback se fornita
        onOrderNotificationTap?.(orderId);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router, onOrderNotificationTap]);

  return {
    // Funzione per gestire manualmente la navigazione da notifica
    handleNotificationNavigation: (orderId: string) => {
      if (Platform.OS === 'web') {
        router.push('/orders');
      } else {
        router.push({
          pathname: '/orders',
          params: {
            openOrderId: orderId
          }
        });
      }
    }
  };
};
