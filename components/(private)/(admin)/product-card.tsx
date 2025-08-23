import { Card, CardHeader } from '@/components/ui/card'
import { ProductProps, SpianataProps } from '@/types/types'
import React from 'react'
import { Text, TouchableOpacity, View, Image } from 'react-native'

const ProductCard = ({
  product, 
  type, 
  setShowInfo, 
  isSelected,
  isTopProduct,
  topProductPosition
}: {
  product: ProductProps | SpianataProps, 
  type: string, 
  setShowInfo: (product: ProductProps | SpianataProps) => void, 
  isSelected: boolean,
  isTopProduct: boolean,
  topProductPosition: number | null
}) => {
  return (
    <Card className={`mb-2 ${isSelected ? 'border-blue-500' : isTopProduct ? 'border-green-500' : ''}`}>
      <TouchableOpacity onPress={() => {
        setShowInfo(product);
      }}>
        <CardHeader className='pl-0 py-0'>
          <View className='flex-row items-center gap-x-4'>

            <Image 
              source={{ uri: product.image }}
              className="w-24 h-24 rounded-l-xl"
              width={96}
              height={96}
              resizeMode='cover'
            />

            <View className="flex-1 flex-col">
              <Text className="font-medium text-base">{product.name}</Text>
              {product.price && (
                <Text className="text-sm font-semibold text-green-600">€{product.price.toFixed(2)}</Text>
              )}
            </View>
            {isTopProduct && topProductPosition && (
              <View className="bg-green-100 px-2 py-1 rounded-full">
                <Text className="text-xs text-green-700 font-semibold">
                  #{topProductPosition} più venduto
                </Text>
              </View>
            )}
          </View>
        </CardHeader>
      </TouchableOpacity>
    </Card>
  )
}

export default ProductCard