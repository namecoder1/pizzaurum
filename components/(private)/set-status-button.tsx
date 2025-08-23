'use client'

import { OrderProps } from "@/types/types";
import { useState } from "react";
import Button from "../ui/button";
import ConfirmationDialog from "../ui/confirmation-dialog";


const SetStatusButton = ({ 
  status, 
  isDelivery, 
  orderId, 
  onStatusUpdated,
  updateOrderStatus
}: { 
  status: string, 
  isDelivery: boolean, 
  orderId: string,
  onStatusUpdated?: (orderId: string, newStatus: OrderProps['status']) => void,
  updateOrderStatus: (status: OrderProps['status'], orderId: string) => Promise<void>
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Mappa per ottenere il prossimo status basato sul testo del bottone
  const getNextStatus = (buttonText: string, isDelivery: boolean): OrderProps['status'] => {
    if (buttonText === 'Riapri Ordine') return 'pending';
    
    const deliveryMap: Record<string, OrderProps['status']> = {
      'Accetta': 'accepted',
      'In Preparazione': 'in_preparation',
      'In Consegna': 'delivering',
      'Consegnato': 'delivered',
      'Completato': 'completed'
    };
    
    const pickupMap: Record<string, OrderProps['status']> = {
      'Accetta': 'accepted',
      'In Preparazione': 'in_preparation',
      'Pronto per Ritiro': 'ready_to_pickup',
      'Completato': 'completed'
    };
    
    const map = isDelivery ? deliveryMap : pickupMap;
    return map[buttonText] || 'completed';
  };

  // Funzione per ottenere il testo del bottone basato sullo status corrente
  const getButtonText = (currentStatus: string, isDelivery: boolean): string => {
    if (currentStatus === 'cancelled') return 'Riapri Ordine';
    
    if (isDelivery) {
      switch (currentStatus) {
        case 'pending': return 'Accetta';
        case 'accepted': return 'In Preparazione';
        case 'in_preparation': return 'In Consegna';
        case 'delivering': return 'Consegnato';
        case 'delivered': return 'Completato';
        default: return '';
      }
    } else {
      switch (currentStatus) {
        case 'pending': return 'Accetta';
        case 'accepted': return 'In Preparazione';
        case 'in_preparation': return 'Pronto per Ritiro';
        case 'ready_to_pickup': return 'Completato';
        default: return '';
      }
    }
  };

  const buttonText = getButtonText(status, isDelivery);
  
  if (!buttonText) {
    return null; // Non mostrare bottone se non c'è un prossimo status
  }

  const handleStatusUpdate = async () => {
    const nextStatus = getNextStatus(buttonText, isDelivery);
    try {
      await updateOrderStatus(nextStatus, orderId);
      onStatusUpdated?.(orderId, nextStatus);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleButtonPress = () => {
    // Se l'ordine è cancellato e stiamo per riaprirlo, mostra il dialog di conferma
    if (status === 'cancelled' && buttonText === 'Riapri Ordine') {
      setShowConfirmation(true);
    } else {
      handleStatusUpdate();
    }
  };

  return (
    <>
      <Button
        text={buttonText}
        onPress={handleButtonPress}
        variant="primary"
        className="w-fit"
      />
      
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleStatusUpdate}
        title="Conferma Riapertura Ordine"
        message="Sei sicuro di voler riaprire questo ordine? L'ordine tornerà allo stato 'In Attesa' e potrà essere processato normalmente."
        confirmText="Riapri"
        cancelText="Annulla"
        variant="warning"
      />
    </>
  )
}

export default SetStatusButton;