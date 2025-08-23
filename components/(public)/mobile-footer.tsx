import { View, Text } from 'react-native'
import { Link } from 'expo-router'
import { FontAwesome, FontAwesome6 } from '@expo/vector-icons'

const MobileFooter = () => {
  return (
    <View className='pb-10 flex-row justify-between items-center px-4 gap-x-4 border-t border-gray-200 pt-4'>
      <Text className='text-xs text-gray-500 w-fit'>
        &copy; {new Date().getFullYear()} Pizzaurum | Tutti i diritti riservati.
      </Text>
      <View className='flex-row gap-x-6'>
        <Link href='tel:07211710710'>
          <FontAwesome name='phone' size={20} color='#B91223' />
        </Link>
        <Link href='https://maps.app.goo.gl/kk2RQfaEdNaYfivCA'>
          <FontAwesome6 name='map-location-dot' size={20} color='#B91223' />
        </Link>
      </View>
    </View>
  )
}

export default MobileFooter