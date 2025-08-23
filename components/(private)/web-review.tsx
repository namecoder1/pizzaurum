import { Star } from '@/lib/icons/Star'
import { CustomerReviewProps } from '@/types/types'
import { format } from 'date-fns'
import { router } from 'expo-router'
import React from 'react'
import Button from '../ui/button'

const WebReview = ({ userId, id, review }: { userId: string, id: string, review: CustomerReviewProps }) => {
  const { user_id, product_rating, delivery_rating, service_rating, comment, created_at } = review

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <article className='bg-white rounded-xl p-4 border-2 border-gray-200'>
      <div className='flex flex-col space-y-3'>
        {/* Header with user info and date */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <div className='w-8 h-8 bg-gradient-to-br from-primary/30 via-primary to-primary/70 rounded-full flex items-center justify-center'>
              <span className='text-white font-semibold text-xs'>
                {userId.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 text-sm'>{userId}</h3>
              <p className='text-xs text-gray-500'>
                {format(new Date(created_at), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Comment */}
        <div className='bg-gray-50 rounded-md p-3'>
          <p className='text-gray-700 text-sm leading-relaxed italic'>{comment?.length > 0 ? `"${comment}"` : "Nessun commento"}</p>
        </div>

        {/* Ratings */}
        <div className='grid grid-cols-3 gap-2'>
          {/* Product Rating */}
          <div className='flex flex-col items-center space-y-1 p-2 bg-orange-50 rounded-md'>
            <span className='text-xs font-medium text-gray-700'>Prodotto</span>
            <div className='flex items-center space-x-0.5'>
              {renderStars(product_rating)}
            </div>
            <span className='text-xs text-gray-500'>{product_rating}/5</span>
          </div>

          {/* Delivery Rating */}
          <div className='flex flex-col items-center space-y-1 p-2 bg-blue-50 rounded-md'>
            <span className='text-xs font-medium text-gray-700'>Consegna</span>
            <div className='flex items-center space-x-0.5'>
              {delivery_rating ? renderStars(delivery_rating) : (
                <span className='text-gray-400 text-xs'>N/A</span>
              )}
            </div>
            <span className='text-xs text-gray-500'>
              {delivery_rating ? `${delivery_rating}/5` : 'N/A'}
            </span>
          </div>

          {/* Service Rating */}
          <div className='flex flex-col items-center space-y-1 p-2 bg-green-50 rounded-md'>
            <span className='text-xs font-medium text-gray-700'>Servizio</span>
            <div className='flex items-center space-x-0.5'>
              {renderStars(service_rating)}
            </div>
            <span className='text-xs text-gray-500'>{service_rating}/5</span>
          </div>
        </div>
        <Button
          text="Vedi ordine"
          onPress={() => {
            router.push(`/ordini/${id}`)
          }}
          className="w-full"
        />
      </div>
    </article>
  )
}

export default WebReview