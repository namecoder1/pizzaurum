import { ProductProps, SpianataProps } from '@/types/types'
import React from 'react'
import { Image } from 'react-native'

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
    <div 
        onClick={() => setShowInfo(product)} 
        className={`w-full p-4 mb-2 cursor-pointer border rounded-lg transition-colors ${
          isSelected ? 'border-blue-500 bg-blue-50' : 
          isTopProduct ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className='flex items-center gap-x-2'>
            <Image 
              source={{ uri: product.image }}
              className='w-10 h-10 rounded-xl border border-border'
              width={40}
              height={40}
              resizeMode='cover'
            />
            <div>
              <p className="font-medium">{product.name}</p>
              {product.price && (
                <p className="text-sm text-gray-600">€{product.price.toFixed(2)}</p>
              )}
              
            </div>
          </div>
          {isTopProduct && topProductPosition && (
            <p className="text-xs text-green-600 font-semibold">
              #{topProductPosition} più venduto 
            </p>
          )}
        </div>
      </div>
  )
}

export default ProductCard