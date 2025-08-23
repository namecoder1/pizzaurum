import React, { useState } from 'react'
import { Text, View } from 'react-native'
import AutocompleteInput from './autocomplete-input'
import { printLog } from '@/lib/utils'

const AutocompleteTest = () => {
  const [address, setAddress] = useState('')

  const handleAddressSelect = (selectedAddress: string, placeId: string) => {
    printLog(`🔍 Selected address: ${selectedAddress}`)
    printLog(`🔍 Place ID: ${placeId}`)
  }

  return (
    <View className="p-4">
      <Text className="text-lg font-bold mb-4">Test Autocomplete</Text>
      <AutocompleteInput
        value={address}
        onChange={setAddress}
        placeholder="Inserisci un indirizzo"
        onAddressSelect={handleAddressSelect}
      />
      <Text className="mt-4 text-sm text-gray-600">
        Indirizzo selezionato: {address}
      </Text>
    </View>
  )
}

export default AutocompleteTest 