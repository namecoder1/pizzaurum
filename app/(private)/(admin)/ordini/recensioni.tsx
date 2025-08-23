import PageHeader from '@/components/(private)/page-header';
import PrivateLayout from '@/components/(private)/private-layout';
import WebReview from '@/components/(private)/web-review';
import { Separator } from '@/components/ui/separator';
import { createClientSupabase } from '@/lib/supabase';
import { CustomerReviewProps, OrderProps, UserProps } from '@/types/types';
import React from 'react';

const ReportedOrders = () => {
  const [orders, setOrders] = React.useState<OrderProps[]>([]);
  const [users, setUsers] = React.useState<{ [key: string]: UserProps }>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchReportedOrders = async () => {
      try {
        setLoading(true);
        
        // Fetch reported orders
        const { data: ordersData, error: ordersError } = await createClientSupabase()
          .from('orders')
          .select('*')
          .not('customer_review', 'is', null)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          return;
        }

        setOrders(ordersData as unknown as OrderProps[]);

        // Fetch user information for all orders
        if (ordersData && ordersData.length > 0) {
          const userIds = [...new Set(ordersData.map(order => order.user_id))];
          
          const { data: usersData, error: usersError } = await createClientSupabase()
            .from('users')
            .select('*')
            .in('id', userIds);

          if (usersError) {
            console.error('Error fetching users:', usersError);
            return;
          }

          // Create a map of user data by user_id
          const usersMap: { [key: string]: UserProps } = {};
          usersData?.forEach(user => {
            usersMap[user.id as string] = user as unknown as UserProps;
          });

          setUsers(usersMap);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReportedOrders();
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Caricamento...</div>
  }

  if (orders.length === 0) {
    return (
      <PrivateLayout title="Nessun ordine segnalato | Pizzaurum" description="Nessun ordine segnalato">
        <section className='max-w-7xl mx-auto w-full px-4 py-8'>
          <h1 className='text-2xl font-bold'>Ordini segnalati</h1>
          <Separator className='my-4' />
          <div className="text-center py-8">Nessun ordine segnalato</div>
        </section>
      </PrivateLayout>
    )
  }

  return (
    <PrivateLayout title="Ordini segnalati | Pizzaurum" description="Ordini segnalati">

      <section className='max-w-7xl mx-auto w-full px-4 py-8'>
        <PageHeader title="Ordini segnalati" description="Gestisci tutti gli ordini segnalati nella piattaforma" />
        <Separator className='my-4' />

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {orders.map((order) => {
            const user = users[order.user_id];

            return (
              <WebReview 
                userId={user.name}
                id={order.id}
                review={order.customer_review as CustomerReviewProps}
              />
            );
          })}
        </div>
      </section>
    </PrivateLayout>
  )
}

export default ReportedOrders