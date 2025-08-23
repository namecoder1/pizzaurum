import { OrderProps } from '@/types/types'
import React from 'react'

const OrderStatusDisplayer = ({ 
  status, 
  order 
}: { 
  status: OrderProps['status'], 
  order: OrderProps 
}) => {
  return (
    <ul className="relative border-l border-gray-200 ml-3">
      <li className="mb-6 ml-6">
        <span className="absolute flex items-center justify-center w-6 h-6 bg-green-100 rounded-full -left-3 ring-8 ring-white">
          <svg
            className="w-3 h-3 text-green-800"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
          </svg>
        </span>
        <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
          Ordine ricevuto
        </h3>
        <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
          {new Date(order.created_at).toLocaleString("it-IT")}
        </time>
        <p className="text-base font-normal text-gray-500">
          Il tuo ordine è stato ricevuto e sarà elaborato a breve
        </p>
      </li>

      {(order.status === "accepted" || 
        order.status === "in_preparation" || 
        order.status === "ready_to_pickup" || 
        order.status === "delivering" ||
        order.status === "completed") && (
        <li className="mb-6 ml-6">
          <span
            className={`absolute flex items-center justify-center w-6 h-6 ${order.status === "accepted" || order.status === "in_preparation" || order.status === "ready_to_pickup" || order.status === "delivering" || order.status === "completed" ? "bg-blue-100" : "bg-gray-100"} rounded-full -left-3 ring-8 ring-white`}
          >
            <svg
              className={`w-3 h-3 ${order.status === "accepted" || order.status === "in_preparation" || order.status === "ready_to_pickup" || order.status === "delivering" || order.status === "completed" ? "text-blue-800" : "text-gray-500"}`}
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
            </svg>
          </span>
          <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
            Ordine accettato
          </h3>
          <p className="text-base font-normal text-gray-500">
            Il tuo ordine è stato accettato e sarà preparato a breve.
          </p>
        </li>
      )}

      {(order.status === "in_preparation" ||
        order.status === "ready_to_pickup" ||
        order.status === "delivering" ||
        order.status === "completed") && (
        <li className="mb-6 ml-6">
          <span
            className={`absolute flex items-center justify-center w-6 h-6 ${order.status === "in_preparation" || order.status === "ready_to_pickup" || order.status === "delivering" || order.status === "completed" ? "bg-purple-100" : "bg-gray-100"} rounded-full -left-3 ring-8 ring-white`}
          >
            <svg
              className={`w-3 h-3 ${order.status === "in_preparation" || order.status === "ready_to_pickup" || order.status === "delivering" || order.status === "completed" ? "text-purple-800" : "text-gray-500"}`}
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
            </svg>
          </span>
          <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
            In preparazione
          </h3>
          <p className="text-base font-normal text-gray-500">
            Il tuo ordine è in fase di preparazione.
          </p>
        </li>
      )}

      {(order.status === "ready_to_pickup" ||
        order.status === "delivering" ||
        order.status === "completed") && (
        <li className="mb-6 ml-6">
          <span
            className={`absolute flex items-center justify-center w-6 h-6 ${order.status === "ready_to_pickup" || order.status === "delivering" || order.status === "completed" ? "bg-yellow-100" : "bg-gray-100"} rounded-full -left-3 ring-8 ring-white`}
          >
            <svg
              className={`w-3 h-3 ${order.status === "ready_to_pickup" || order.status === "delivering" || order.status === "completed" ? "text-yellow-800" : "text-gray-500"}`}
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
            </svg>
          </span>
          <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
            Pronto per il ritiro
          </h3>
          <p className="text-base font-normal text-gray-500">
            Il tuo ordine è pronto e può essere ritirato!
          </p>
        </li>
      )}

      {order.status === "delivering" && (
        <li className="mb-6 ml-6">
          <span className="absolute flex items-center justify-center w-6 h-6 bg-orange-100 rounded-full -left-3 ring-8 ring-white">
            <svg
              className="w-3 h-3 text-orange-800"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
            </svg>
          </span>
          <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
            In Consegna
          </h3>
          <p className="text-base font-normal text-gray-500">
            Il tuo ordine è in consegna e arriverà a breve!
          </p>
        </li>
      )}

      {order.status === "completed" && (
        <li className="ml-6">
          <span className="absolute flex items-center justify-center w-6 h-6 bg-green-100 rounded-full -left-3 ring-8 ring-white">
            <svg
              className="w-3 h-3 text-green-800"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z" />
            </svg>
          </span>
          <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
            Completato
          </h3>
          <p className="text-base font-normal text-gray-500">
            Il tuo ordine è stato completato. Buon appetito!
          </p>
        </li>
      )}

      {order.status === "cancelled" && (
        <li className="ml-6">
          <span className="absolute flex items-center justify-center w-6 h-6 bg-red-100 rounded-full -left-3 ring-8 ring-white">
            <svg
              className="w-3 h-3 text-red-800"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-4a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v5Z" />
            </svg>
          </span>
          <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
            {order.is_refunded ? 'Rimborsato' : 'Cancellato'}
          </h3>
          {order.is_refunded && (
            <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
              {new Date(order.refunded_at as string).toLocaleString("it-IT")}
            </time>
          )}
          <p className="text-base font-normal text-gray-500">
            {order.is_refunded ? 'L\'ordine è stato rimborsato.' : 'L\'ordine è stato cancellato.'}
          </p>
        </li>
      )}
    </ul>
  )
}

export default OrderStatusDisplayer