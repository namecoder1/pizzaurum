import { createClientSupabase } from '@/lib/supabase';
import { printLog } from '@/lib/utils';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useSavePushToken = () => {
  useEffect(() => {
    const savePushToken = async () => {
      try {
        // Richiedi i permessi per le notifiche
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

        // Configura il canale Android se necessario
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('orders', {
            name: 'Orders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        // Ottieni il push token
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'b6532ec2-cf19-4f72-bdc3-89504819876d'
        });

        if (!token.data) {
          printLog('❌ No push token received', true);
          return;
        }

        printLog(`📱 Push token received: ${token.data.substring(0, 20)}...`);

        // Salva il token nel database
        const supabase = createClientSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          printLog('❌ No user found, cannot save push token', true);
          return;
        }

        const { error } = await supabase
          .from('users')
          .update({ expo_push_token: token.data })
          .eq('id', user.id);

        if (error) {
          printLog(`❌ Error saving push token: ${error.message}`, true);
        } else {
          printLog('✅ Push token saved successfully');
        }

      } catch (error) {
        // Gestione specifica per errori di configurazione iOS
        if (error instanceof Error) {
          if (error.message.includes('aps-environment')) {
            printLog('⚠️ Push notifications not configured for development. This is normal in development mode.', true);
            printLog('💡 To test push notifications, build the app with EAS Build or use a physical device with proper provisioning.', true);
          } else {
            printLog(`❌ Error getting push token: ${error.message}`, true);
          }
        } else {
          printLog(`❌ Unknown error getting push token: ${error}`, true);
        }
      }
    };

    savePushToken();
  }, []);
};
