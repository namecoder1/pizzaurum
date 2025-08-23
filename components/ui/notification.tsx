import { AntDesign } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

interface ToastNotificationProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function ToastNotification({
  visible,
  message,
  type,
  onClose,
  duration = 5000,
}: ToastNotificationProps) {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      if (duration > 0) {
        const timer = setTimeout(() => {
          hideNotification();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideNotification();
    }
  }, [visible, duration]);

  const hideNotification = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onClose();
    });
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: 'checkcircle',
          iconColor: '#10B981',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'closecircle',
          iconColor: '#EF4444',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'exclamationcircle',
          iconColor: '#F59E0B',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'infocirlce',
          iconColor: '#3B82F6',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: 'infocirlce',
          iconColor: '#6B7280',
        };
    }
  };

  const styles = getTypeStyles();

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        opacity: animation,
        transform: [
          {
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0],
            }),
          },
        ],
      }}
      className={`absolute top-4 left-4 right-4 z-50 p-4 rounded-lg border ${styles.bg} ${styles.border} shadow-lg`}
    >
      <View className="flex-row items-center">
        <AntDesign
          name={styles.icon as any}
          size={20}
          color={styles.iconColor}
        />
        <Text className={`flex-1 ml-3 font-medium ${styles.text}`}>
          {message}
        </Text>
        <TouchableOpacity onPress={hideNotification} className="ml-2">
          <AntDesign name="close" size={16} color={styles.iconColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
} 