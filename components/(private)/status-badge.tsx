import { getStatusText } from '@/lib/utils'
import React from 'react'
import { Platform, Text, View } from 'react-native'

const StatusBadge = ({ status, isRefunded }: { status: string, isRefunded?: boolean }) => {
  const os = Platform.OS

  const getStatusColor = (status: string) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
    if (status === 'accepted') return 'bg-blue-100 text-blue-800'
    if (status === 'cancelled') return 'bg-red-100 text-red-800'
    if (status === 'in_preparation') return 'bg-green-100 text-green-800'
    if (status === 'ready_to_pickup') return 'bg-blue-100 text-blue-800'
    if (status === 'not_picked_up') return 'bg-purple-100 text-purple-800'
    if (status === 'delivering') return 'bg-orange-100 text-orange-800'
    if (status === 'delivered') return 'bg-green-100 text-green-800'
    if (status === 'completed') return 'bg-green-100 text-green-800'
    if (status === 'reopened') return 'bg-gray-100 text-gray-800 border border-gray-400 border-dashed'
    if (status === 'reported') return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (os === 'web') {
    return (
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        <p className='border-none'>
          {isRefunded ? 'Rimborsato' : getStatusText(status)}
        </p>
      </div>
    )
  }

  return (
    <View className={`px-2 py-1 rounded-full text-xs font-medium ${isRefunded ? 'bg-red-100' : getStatusColor(status)}`}>
      <Text className={`text-xs font-medium ${isRefunded ? 'text-red-800' : getStatusColor(status)}`}>{isRefunded ? 'Rimborsato' : getStatusText(status)}</Text>
    </View>
  )
}

export default StatusBadge