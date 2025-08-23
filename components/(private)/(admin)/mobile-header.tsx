import { useAuth } from '@/contexts/auth-context'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

const MobileHeader = ({ title, icon }: { title: string, icon: keyof typeof Ionicons.glyphMap }) => {
  const { signOut } = useAuth();

  const handleLogout = () => {
    signOut();
  }

  return (
    <View className="px-6 py-4 border-b border-border flex flex-row items-center justify-between gap-x-3">
      <View className="flex-row items-center gap-x-3">
        <View className="bg-primary/80 p-2 rounded-xl">
          <Ionicons name={icon} size={24} color="white" />
        </View>
        <Text className="text-3xl font-bold">{title}</Text>
      </View>
      <TouchableOpacity
        className="flex flex-row items-center gap-x-1.5"
        onPress={handleLogout}
      >
        <Text className="text-sm text-red-500">Esci</Text>
        <Ionicons name="log-out-outline" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  )
}

export default MobileHeader