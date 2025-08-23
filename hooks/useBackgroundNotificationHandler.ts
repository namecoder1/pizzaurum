import { printLog } from '@/lib/utils';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Configura il comportamento delle notifiche
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useBackgroundNotificationHandler = () => {
  useEffect(() => {
    // Configura il handler per le notifiche in background
    const backgroundNotificationHandler = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      printLog(`📱 Background notification tapped: ${JSON.stringify(data)}`);

      // Qui puoi gestire la logica per le notifiche in background
      // Per ora, la navigazione verrà gestita dal hook useNotificationNavigation
      // quando l'app torna in foreground
    });

    // Richiedi i permessi per le notifiche
    const requestPermissions = async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('orders', {
            name: 'Orders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          printLog('❌ Notification permissions not granted', true);
          return;
        }

        printLog('✅ Notification permissions granted');
      } catch (error) {
        printLog(`❌ Error requesting notification permissions: ${error}`, true);
      }
    };

    requestPermissions();

    return () => {
      if (backgroundNotificationHandler) {
        Notifications.removeNotificationSubscription(backgroundNotificationHandler);
      }
    };
  }, []);

  return {
    // Funzione per inviare una notifica di test
    sendTestNotification: async () => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification',
          data: {
            type: 'order_status_update',
            orderId: 'test-order-123',
            navigation: {
              screen: 'orders',
              params: {
                openOrderId: 'test-order-123'
              }
            }
          },
        },
        trigger: null, // Invia immediatamente
      });
    }
  };
};
