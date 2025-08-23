import Button from '@/components/ui/button';
import { useBackgroundNotificationHandler } from '@/hooks/useBackgroundNotificationHandler';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import React from 'react';
import { Text, View } from 'react-native';

const NotificationTest = () => {
  const { handleNotificationNavigation } = useNotificationNavigation({
    onOrderNotificationTap: (orderId: string) => {
      console.log(`Test: Notification tapped for order ${orderId}`);
    }
  });

  const { sendTestNotification } = useBackgroundNotificationHandler();

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const handleTestNavigation = () => {
    handleNotificationNavigation('test-order-123');
  };

  return (
    <View className="p-4 space-y-4">
      <Text className="text-lg font-bold">Test Notifiche</Text>
      
      <Button
        text="Invia Notifica di Test"
        onPress={handleTestNotification}
        variant="outline"
      />
      
      <Button
        text="Test Navigazione Manuale"
        onPress={handleTestNavigation}
        variant="outline"
      />
      
      <Text className="text-sm text-gray-600">
        Usa questi pulsanti per testare la funzionalità delle notifiche.
        La notifica di test dovrebbe aprire automaticamente il bottom sheet dell'ordine.
      </Text>
    </View>
  );
};

export default NotificationTest;
