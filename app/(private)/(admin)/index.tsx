import MobileHeader from "@/components/(private)/(admin)/mobile-header";
import WebReportForm from "@/components/(private)/(admin)/web-report-form";
import PageHeader from "@/components/(private)/page-header";
import PrivateLayout from "@/components/(private)/private-layout";
import WebOrder from "@/components/(private)/web-order";
import WebReview from "@/components/(private)/web-review";
import Loader from "@/components/ui/Loader";
import { Separator } from "@/components/ui/separator";
import { useOrderProductsEnrichmentForOrders } from "@/hooks/useOrderProductsEnrichment";
import { useAdminOrdersWithRealtime } from "@/hooks/useUnifiedOrdersRealtime";
import { OrderProps, ReviewProps } from "@/types/types";
import { Link, useRouter } from "expo-router";
import { CalendarClockIcon, ClockIcon, ShoppingCartIcon, UserIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../contexts/auth-context";
import { createClientSupabase } from "../../../lib/supabase";

interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const { session } = useAuth();
  const os = Platform.OS
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0,
  });
  const [reviews, setReviews] = useState<ReviewProps[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Usa il hook real-time per gli ordini
  const {
    orders,
    loading: ordersLoading,
    isConnected,
    getTodayOrders,
    getPendingOrders
  } = useAdminOrdersWithRealtime({
    enabled: true,
    onOrderInsert: (newOrder: OrderProps) => {
      updateStats();
    },
    onOrderUpdate: (updatedOrder: OrderProps) => {
      updateStats();
    },
    onOrderDelete: (orderId: string) => {
      updateStats();
    },
    onError: (error: any) => {
    }
  });

  // Funzione per aggiornare le statistiche
  const updateStats = useCallback(async () => {
    try {
      // Query ottimizzate per le statistiche
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Query parallele per le statistiche
      const [totalUsers, totalOrders, todayOrders, pendingOrders] = await Promise.all([
        // Totale utenti
        createClientSupabase()
          .from("users")
          .select("*", { count: "exact", head: true }),
        
        // Totale ordini
        createClientSupabase()
          .from("orders")
          .select("*", { count: "exact", head: true }),
        
        // Ordini di oggi
        createClientSupabase()
          .from("orders")
          .select("*", { count: "exact", head: true })
          .gte('created_at', today)
          .lt('created_at', tomorrow),
        
        // Ordini in attesa
        createClientSupabase()
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in('status', ['pending', 'accepted'])
      ]);

      setStats({
        totalUsers: totalUsers.count || 0,
        totalOrders: totalOrders.count || 0,
        todayOrders: todayOrders.count || 0,
        pendingOrders: pendingOrders.count || 0,
      });
    } catch (error) {
      console.error("Error updating stats:", error);
    }
  }, []);

  // Fetch iniziale delle statistiche e recensioni
  useEffect(() => {
    if (!session) return;

    const fetchInitialData = async () => {
      try {
        await updateStats();

        // Fetch reviews ottimizzato
        const { data: reviewsData, error: reviewsError } = await createClientSupabase()
          .from('orders')
          .select('customer_review, id, user_id, created_at')
          .not('customer_review', 'is', null)
          .order('created_at', { ascending: false })
          .limit(4);

        if (reviewsError) {
          console.error("Error fetching reviews:", reviewsError);
        } else {
          setReviews(reviewsData as unknown as ReviewProps[]);
          
          // Fetch user profiles ottimizzato - batch query invece di loop
          const userIds = (reviewsData as any[])?.map((review: any) => review.user_id).filter((id: string) => id) || [];
          const uniqueUserIds = [...new Set(userIds as string[])];
          
          if (uniqueUserIds.length > 0) {
            try {
              const { data: userProfilesData, error: userProfilesError } = await createClientSupabase()
                .from('users')
                .select('id, name')
                .in('id', uniqueUserIds);
              
              if (!userProfilesError && userProfilesData) {
                const userProfilesMap: Record<string, string> = {};
                (userProfilesData as any[]).forEach((user: any) => {
                  userProfilesMap[user.id] = user.name;
                });
                setUserProfiles(userProfilesMap);
              }
            } catch (error) {
              console.error("Error fetching user profiles:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [session, updateStats]);

  // Aggiorna le statistiche quando cambiano gli ordini
  useEffect(() => {
    if (orders.length > 0) {
      updateStats();
    }
  }, [orders, updateStats]);

    // Enrich products for all orders while preserving order structure
    const { enrichedOrders, isEnriching: isEnrichingProducts } = useOrderProductsEnrichmentForOrders({
      orders: orders,
      enabled: orders.length > 0
    });

  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const lastOrders = enrichedOrders.slice(0, 4);

  const menuItems = [
    {
      title: "Gestione Utenti",
      description: "Visualizza e gestisci tutti gli utenti",
      count: stats.totalUsers,
      onPress: () => router.push("/(private)/(admin)/utenti"),
      color: "bg-blue-400",
      icon: <UserIcon size={20} color="white" />,
      href: "/(private)/(admin)/utenti",
    },
    {
      title: "Gestione Ordini",
      description: "Visualizza e gestisci tutti gli ordini",
      count: stats.totalOrders,
      onPress: () => router.push("/(private)/(admin)/ordini"),
      color: "bg-green-400",
      icon: <ShoppingCartIcon size={20} color="white" />,
      href: "/(private)/(admin)/ordini",
    },
    {
      title: "Ordini di oggi",
      description: "Analytics e reportistica",
      count: stats.todayOrders,
      onPress: () => router.push("/(private)/(admin)/analitiche"),
      color: "bg-purple-400",
      icon: <CalendarClockIcon size={20} color="white" />,
      href: "/(private)/(admin)/analitiche",
    },
    {
      title: "Ordini in Attesa",
      description: "Ordini che richiedono attenzione",
      count: stats.pendingOrders,
      onPress: () => router.push("/(private)/(admin)/ordini"),
      color: "bg-orange-400",
      icon: <ClockIcon size={20} color="white" />,
      href: "/(private)/(admin)/ordini",
    },
  ];

  const mobileMenuItems = [
    {
      title: "Gestione Prodotti",
      description: "Visualizza e gestisci tutti i prodotti",
      count: 0,
      onPress: () => router.push("/(private)/(admin)/prodotti"),
      color: "bg-red-400",
      icon: <ShoppingCartIcon size={20} color="white" />,
      href: "/(private)/(admin)/prodotti",
    },
    ...menuItems.slice(0, 2)
  ]

  if (loading || ordersLoading) {
    return <Loader size="fullscreen" text="Caricamento dashboard..." />;
  }

  if (os === "web") {
    return (
      <PrivateLayout title="Dashboard | Pizzaurum" description="Con la dashboard puoi gestire tutti gli ordini, gli utenti e le recensioni">
        <section className="max-w-7xl mx-auto w-full px-4 py-8">
          <PageHeader title="Dashboard" description="Con la dashboard puoi gestire tutti gli ordini, gli utenti e le recensioni" showChildren={true} />

          <Separator className="my-4" />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {menuItems.map((item, index) => (
              <InfoBox 
                key={index}
                icon={item.icon}
                text={item.title}
                data={item.count}
                bgColor={item.color}
                href={item.href}
              />
            ))}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Ultime Recensioni</h2>
          <div>
            {reviews.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Non hai ancora ricevuto recensioni
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                {reviews.map((review) => (
                  <WebReview 
                    key={review.id} 
                    userId={userProfiles[review.user_id] || 'Utente sconosciuto'} 
                    id={review.id}
                    review={review.customer_review} 
                  />
                ))}
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mt-10">Ultimi Ordini</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {lastOrders.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Nessun ordine trovato
              </div>
            ) : (
              lastOrders.map((order) => (
                <WebOrder 
                  key={order.id} 
                  order={order} 
                  isAdmin 
                  currentUserId={undefined} // Admin non ha bisogno del currentUserId per i controlli
                  onReportOrder={(orderId) => {
                    setSelectedOrderId(orderId);
                    setReportFormOpen(true);
                  }}
                  onRefundOrder={() => {}} // Admin index non gestisce refund, solo visualizza
                  showReport={true}
                />
              ))
            )}
          </div>
        </section>

        {/* WebReportForm per la pagina admin */}
        {reportFormOpen && (
          <WebReportForm 
            open={reportFormOpen} 
            setOpen={(open) => {
              setReportFormOpen(open);
              if (!open) {
                // Refresh stats when form is closed
                updateStats();
              }
            }} 
            orderId={selectedOrderId} 
          />
        )}
      </PrivateLayout>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <MobileHeader title="Dashboard" icon="home-outline" />
      <ScrollView className="flex-1 px-4 py-6">
        {/* Header con indicatore real-time */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold">Dashboard Admin</Text>
        </View>

        {/* Stats Grid */}
        <View className="flex flex-row items-center justify-center gap-4 mb-6 px-2">
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-1/2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-blue-500 p-2 rounded-lg">
                <UserIcon size={16} color="white" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">{stats.totalUsers}</Text>
            </View>
            <Text className="text-sm font-medium text-gray-900">Utenti</Text>
          </View>
          
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-1/2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-green-500 p-2 rounded-lg">
                <ShoppingCartIcon size={16} color="white" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">{stats.totalOrders}</Text>
            </View>
            <Text className="text-sm font-medium text-gray-900">Ordini</Text>
          </View>
        </View>

        <View className="flex flex-row items-center justify-center gap-4 mb-6 px-2"> 
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-1/2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-purple-500 p-2 rounded-lg">
                <CalendarClockIcon size={16} color="white" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">{stats.todayOrders}</Text>
            </View>
            <Text className="text-sm font-medium text-gray-900">Ordini di oggi</Text>
          </View>
          
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-1/2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-orange-500 p-2 rounded-lg">
                <ClockIcon size={16} color="white" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</Text>
            </View>
            <Text className="text-sm font-medium text-gray-900">In Attesa</Text>
          </View>


        </View>

        {/* Menu Items */}
        <View className="flex flex-col gap-4 mb-20">
          {mobileMenuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              onPress={item.onPress}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <View className={`p-2 rounded-lg mr-3 ${item.color}`}>
                      {item.icon}
                    </View>
                    <Text className="text-xl font-bold text-gray-900">
                      {item.count}
                    </Text>
                  </View>
                  <Text className="text-lg font-semibold text-gray-900 mb-1">
                    {item.title}
                  </Text>
                  <Text className="text-gray-600">{item.description}</Text>
                </View>
                <View className="w-2 h-2 bg-gray-300 rounded-full" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoBox = ({ 
  icon,
  text,
  data,
  bgColor,
  href
}: {
  icon: React.ReactNode;
  text: string;
  data: number;
  bgColor: string;
  href: string;
}) => {
  return (
    <Link href={href as any} className="rounded-xl border border-border bg-card shadow-sm shadow-foreground/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">{data}</div>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{text}</h3>
    </Link>
  )
}
