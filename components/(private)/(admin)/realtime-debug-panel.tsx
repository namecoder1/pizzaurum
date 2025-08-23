import { createClientSupabase } from "@/lib/supabase";
import { OrderProps } from "@/types/types";
import React, { useState } from "react";
import Button from "../../ui/button";
import { printLog } from "@/lib/utils";

interface RealtimeDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RealtimeDebugPanel({ isOpen, onClose }: RealtimeDebugPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [testOrderId, setTestOrderId] = useState<string>('');

  const createTestOrder = async () => {
    setIsCreating(true);
    try {
      const supabase = createClientSupabase();
      
      // Crea un ordine di test
      const testOrder = {
        user_id: '87515555-6562-4deb-8116-01acc2d70a26',
        products: [
          {
            id: 'test-product',
            name: 'Test Pizza',
            price: 10.00,
            quantity: 1
          }
        ],
        price: 10.0,
        status: 'pending' as OrderProps['status'],
        is_delivery: false,
        customer_time: new Date().toISOString(),
        is_custom_time: false,
        stripe_payment_intent_id: 'test-payment-intent',
        payment_issuer: 'Test',
        net_profit: 9070
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(testOrder)
        .select()
        .single();

      if (error) {
        printLog(`❌ Error creating test order: ${error}`, true);
        alert('Errore nella creazione dell\'ordine di test: ' + error.message);
      } else {
        setTestOrderId(data.id as string);
        alert('Ordine di test creato con successo! ID: ' + data.id);
      }
    } catch (error) {
      printLog(`❌ Error creating test order: ${error}`, true);
      alert('Errore: ' + error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTestOrder = async () => {
    if (!testOrderId) {
      alert('Nessun ordine di test da eliminare');
      return;
    }

    try {
      const supabase = createClientSupabase();
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', testOrderId);

      if (error) {
        printLog(`❌ Error deleting test order: ${error}`, true);
        alert('Errore nell\'eliminazione dell\'ordine di test: ' + error.message);
      } else {
        printLog(`🟡 Test order deleted successfully`);
        setTestOrderId('');
        alert('Ordine di test eliminato con successo!');
      }
    } catch (error) {
      printLog(`❌ Error deleting test order: ${error}`, true);
      alert('Errore: ' + error);
    }
  };

  const updateTestOrder = async () => {
    if (!testOrderId) {
      alert('Nessun ordine di test da aggiornare');
      return;
    }

    try {
      const supabase = createClientSupabase();
      
      const { error } = await supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', testOrderId);

      if (error) {
        printLog(`❌ Error updating test order: ${error}`, true);
        alert('Errore nell\'aggiornamento dell\'ordine di test: ' + error.message);
      } else {
        printLog(`🟡 Test order updated successfully`);
        alert('Ordine di test aggiornato con successo!');
      }
    } catch (error) {
      printLog(`❌ Error updating test order: ${error}`, true);
      alert('Errore: ' + error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Test Realtime Subscriptions</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Test Operations</h3>
            <div className="space-y-2">
              <Button
                text={isCreating ? "Creando..." : "Crea Ordine di Test"}
                onPress={createTestOrder}
                disabled={isCreating}
                className="w-full"
              />
              
              {testOrderId && (
                <>
                  <Button
                    text="Aggiorna Ordine di Test"
                    onPress={updateTestOrder}
                    variant="outline"
                    className="w-full"
                  />
                  
                  <Button
                    text="Elimina Ordine di Test"
                    onPress={deleteTestOrder}
                    variant="destructive"
                    className="w-full"
                  />
                </>
              )}
            </div>
          </div>

          {testOrderId && (
            <div className="bg-gray-100 p-3 rounded">
              <strong>Test Order ID:</strong>
              <div className="text-sm font-mono break-all">{testOrderId}</div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p>Questo pannello ti permette di testare le subscription real-time:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Crea un ordine di test per verificare INSERT</li>
              <li>Aggiorna l'ordine per verificare UPDATE</li>
              <li>Elimina l'ordine per verificare DELETE</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 