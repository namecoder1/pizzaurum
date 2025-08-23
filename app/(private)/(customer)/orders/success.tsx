import Loader from '@/components/ui/Loader';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import React, { useEffect, useState } from 'react';

export default function OrderSuccessPage() {
  const { session_id } = useLocalSearchParams();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // Protezione rimossa - ora gestita dal layout (customer)

    const getOrderId = async () => {
      if (!session_id) {
        setError('Session ID mancante');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/stripe/get-order-id?session_id=${session_id}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Errore nel recupero dell'ordine: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.order_id) {
          // Reindirizza al dettaglio dell'ordine
          router.replace(`/orders/${data.order_id}`);
        } else {
          console.error('No order_id in response:', data);
          setError('Ordine non trovato');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching order ID:', err);
        setError('Errore nel recupero dell\'ordine');
        setLoading(false);
      }
    };

    getOrderId();
  }, [session_id, router, session, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" text={authLoading ? "Verifica autenticazione..." : "Recupero ordine..."} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Errore</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/orders')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Vai ai tuoi ordini
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">Pagina di Successo</h1>
        <p className="text-gray-600 mb-4">Session ID: {session_id}</p>
        <p className="text-gray-600 mb-4">Utente: {session?.user?.email}</p>
        <p className="text-gray-600 mb-4">Stato: Caricamento completato</p>
        <button 
          onClick={() => router.push('/orders')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Vai ai tuoi ordini
        </button>
      </div>
    </div>
  );
} 