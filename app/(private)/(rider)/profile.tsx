import MobileHeader from '@/components/(private)/(admin)/mobile-header'
import PrivateLayout from '@/components/(private)/private-layout'
import { FontAwesome5 } from '@expo/vector-icons'
import React from 'react'
import { Platform, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';

const RiderProfile = () => {
  const os = Platform.OS

  console.log('🎯 RiderProfile component rendered!', { os });

  if (os === 'web') {
    return (
      <PrivateLayout title='Profilo | Pizzaurum' description='Profilo'>
        <div className='max-w-7xl mx-auto px-4 py-8 w-full'>
          <div className='mb-8'>
            <h1 className="text-3xl font-bold text-gray-900">Profilo & Impostazioni</h1>
            <p className="text-gray-600 mt-2">Gestisci il tuo profilo e le tue impostazioni</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Informazioni Rider</h2>
            <p className="text-gray-600">Qui potrai gestire le tue informazioni personali e le impostazioni del tuo account rider.</p>
          </div>
        </div>
      </PrivateLayout>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <MobileHeader
        title='Profilo' 
        icon={<FontAwesome5 name="user-circle" size={20} color="white" />} 
      />
      <View className="flex-1 p-4 bg-white">
        <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Text className="text-xl font-semibold text-gray-900 mb-4">Profilo Rider</Text>
          <Text className="text-gray-600">Qui potrai gestire le tue informazioni personali e le impostazioni del tuo account rider.</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default RiderProfile