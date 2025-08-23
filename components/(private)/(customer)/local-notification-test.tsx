import Button from '@/components/ui/button';
import { printLog } from '@/lib/utils';
import * as Notifications from 'expo-notifications';
import React from 'react';
import { Text, View } from 'react-native';

const LocalNotificationTest = () => {
  const sendLocalNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notifica Locale',
          body: 'Questa è una notifica locale di test',
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
      printLog('✅ Local notification sent successfully');
    } catch (error) {
      printLog(`❌ Error sending local notification: ${error}`, true);
    }
  };

  const sendDelayedNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Notifica Ritardata',
          body: 'Questa notifica è stata programmata per 5 secondi',
          data: {
            type: 'order_status_update',
            orderId: 'delayed-order-456',
            navigation: {
              screen: 'orders',
              params: {
                openOrderId: 'delayed-order-456'
              }
            }
          },
        },
        trigger: { seconds: 5 },
      });
      printLog('✅ Delayed notification scheduled for 5 seconds');
    } catch (error) {
      printLog(`❌ Error scheduling delayed notification: ${error}`, true);
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      printLog('✅ All notifications cancelled');
    } catch (error) {
      printLog(`❌ Error cancelling notifications: ${error}`, true);
    }
  };

  return (
    <View className="p-4 space-y-4">
      <Text className="text-lg font-bold">Test Notifiche Locali</Text>
      <Text className="text-sm text-gray-600 mb-4">
        Le notifiche locali funzionano in development mode e non richiedono configurazione server.
      </Text>
      
      <Button
        text="Invia Notifica Locale"
        onPress={sendLocalNotification}
        variant="outline"
      />
      
      <Button
        text="Programma Notifica (5s)"
        onPress={sendDelayedNotification}
        variant="outline"
      />
      
      <Button
        text="Cancella Tutte le Notifiche"
        onPress={cancelAllNotifications}
        variant="destructive"
      />
      
      <Text className="text-sm text-gray-600 mt-4">
        💡 Le notifiche locali sono perfette per testare la navigazione e l'UI senza configurazione server.
      </Text>
    </View>
  );
};

export default LocalNotificationTest;
