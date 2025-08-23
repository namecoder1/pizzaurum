import MobileHeader from "@/components/(private)/(admin)/mobile-header";
import ProductCard from "@/components/(private)/(admin)/product-card";
import PageHeader from "@/components/(private)/page-header";
import PrivateLayout from "@/components/(private)/private-layout";
import CustomBottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useSupabase } from "@/contexts/supabase-context";
import { printLog } from "@/lib/utils";
import { AnalyticsData, ProductAnalyticsData, ProductProps, SpianataProps, UserProps } from "@/types/types";
import { fetchProductAnalytics } from "@/utils/analytics-actions";
import { getAllProducts, getTopProductPosition, isTopProduct, useSanityData } from '@/utils/sanity-data';
import { checkIsUser, getInitials, getProductType } from "@/lib/utils";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Session } from "@supabase/supabase-js";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";



export default function AdminUsers() {
  const [tab, setTab] = React.useState('admin');
  const [generalTab, setGeneralTab] = React.useState('users');
  const [selectedProduct, setSelectedProduct] = useState<ProductProps | SpianataProps | null>(null)
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalyticsData | null>(null);
  const os = Platform.OS;
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = React.useState<UserProps[]>([]);
  const [deletingUsers, setDeletingUsers] = React.useState<Set<string>>(new Set());
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserProps | null>(null);
  const { deleteUser } = useAuth();
  const supabaseClient = useSupabase();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleShowInfo = (product: ProductProps | SpianataProps) => {
    setSelectedProduct(product)
    // Fetch product-specific analytics when a product is selected
    if (product.id) {
      fetchProductAnalytics({
        setLoading,
        timeSpan: 'weekly',
        productId: product.id,
        setProductAnalytics
      });
    }
    // Open the bottom sheet
    bottomSheetRef.current?.present();
  }

   // Use the new Sanity data hook
   const sanityData = useSanityData();
   const allProducts = getAllProducts(sanityData);

  const fetchUsers = React.useCallback(async () => {
    if (!supabaseClient) {
      printLog('Failed to initialize Supabase client', true);
      return;
    }
    
    const { data, error } = await supabaseClient
      .from('users')
      .select('*');

    if (error) {
      printLog(`Error fetching users: ${error}`, true);
    } else {
      setUsers(data as unknown as UserProps[]);
    }
  }, [supabaseClient]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = React.useCallback(async (user: UserProps) => {
    if (os === 'web') {
      // Per il web, usa il Dialog
      setUserToDelete(user);
      setDeleteDialogOpen(true);
      return;
    }
    
    // Per mobile, usa Alert.alert
    Alert.alert(
      "Conferma eliminazione",
      `Sei sicuro di voler eliminare l'utente ${user.name || user.email}? Questa azione non può essere annullata.`,
      [
        {
          text: "Annulla",
          style: "cancel",
          onPress: () => printLog('❌ User cancelled deletion', true)
        },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            setDeletingUsers(prev => new Set(prev).add(user.id));
            
            try {
              const { error } = await deleteUser(user.id);
              
              if (error) {
                printLog(`❌ Error from deleteUser: ${error}`, true);
                Alert.alert("Errore", `Impossibile eliminare l'utente: ${error.message}`);
              } else {
                // Rimuovi l'utente dalla lista locale
                setUsers(prev => prev.filter(u => u.id !== user.id));
                Alert.alert("Successo", "Utente eliminato con successo");
              }
            } catch (error) {
              printLog(`❌ Exception during deletion: ${error}`, true);
              Alert.alert("Errore", "Si è verificato un errore durante l'eliminazione");
            } finally {
              setDeletingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(user.id);
                return newSet;
              });
            }
          }
        }
      ]
    );
  }, [deleteUser, os]);

  const confirmDelete = React.useCallback(async () => {
    if (!userToDelete) return;

    setDeletingUsers(prev => new Set(prev).add(userToDelete.id));
    setDeleteDialogOpen(false);
    
    try {
      const { error } = await deleteUser(userToDelete.id);
      
      if (error) {
        printLog(`❌ Error from deleteUser: ${error}`, true);
        alert(`Errore: Impossibile eliminare l'utente: ${error.message}`);
      } else {
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        alert('Utente eliminato con successo');
      }
    } catch (error) {
      printLog(`❌ Exception during deletion: ${error}`, true);
      alert('Si è verificato un errore durante l\'eliminazione');
    } finally {
      setDeletingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userToDelete.id);
        return newSet;
      });
      setUserToDelete(null);
    }
  }, [deleteUser, userToDelete]);

  const cancelDelete = React.useCallback(() => {
    printLog('❌ User cancelled deletion', true);
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  }, []);

  const getReputationText = (score: number) => {
    if (score === 0) return 'N/A';
    return score > 0 ? `Positiva (${score})` : `Negativa (${score || 0})`;
  };

  if (os === 'web') {
    return (
      <PrivateLayout title="Gestione Utenti | Pizzaurum" description="Gestione Utenti">
        <section className="max-w-7xl mx-auto w-full px-4 py-8">
          <PageHeader title="Gestione Utenti" description="Gestisci tutti gli utenti registrati nella piattaforma" showChildren={true}>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{users.length}</div>
              <div className="text-sm text-gray-500">Utenti totali</div>
            </div>
          </PageHeader>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-row items-center">
              <TabsTrigger value="admin" className="flex-1"><Text>Amministratori</Text></TabsTrigger>
              <TabsTrigger value="client" className="flex-1"><Text>Clienti</Text></TabsTrigger>
            </TabsList>
            <TabsContent value="admin" className="mt-4 flex flex-col gap-2">
              {users.filter(user => user.role === 'admin').map((user) => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/90 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {user.id === session?.user?.id ? 'Tu' : user.name || 'Utente senza nome'}
                          </h3>
                          <p className="text-gray-500 text-sm">{user.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="client" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
              {users.filter(user => user.role !== 'admin').map((user) => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-primary/90 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {user.name || 'Utente senza nome'}
                          </h3>
                          <p className="text-gray-500 text-sm">{user.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    {user.role !== 'admin' ? (
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.reputation_score === 0 ? 'bg-gray-100 text-gray-600' :
                        user.reputation_score > 0 ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {getReputationText(user.reputation_score)}
                      </div>
                    ) : (
                      <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Admin
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 text-gray-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-gray-600">{user.phone || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 text-gray-400 mt-0.5">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-gray-600 flex-1">{user.address || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 text-gray-400">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        }) || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <Button
                      text={deletingUsers.has(user.id) ? 'Eliminando...' : 'Elimina utente'}
                      variant="destructive"
                      onPress={() => {
                        handleDeleteUser(user);
                      }}
                      className="w-fit ml-auto"
                      disabled={deletingUsers.has(user.id)}
                    />
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </section>

        {/* Dialog di conferma eliminazione */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma eliminazione</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler eliminare l'utente {userToDelete?.name || userToDelete?.email}? 
                Questa azione non può essere annullata.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                text="Annulla"
                variant="outline"
                onPress={cancelDelete}
                disabled={deletingUsers.has(userToDelete?.id || '')}
              />
              <Button
                text={deletingUsers.has(userToDelete?.id || '') ? "Eliminando..." : "Elimina"}
                variant="destructive"
                onPress={confirmDelete}
                disabled={deletingUsers.has(userToDelete?.id || '')}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PrivateLayout>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <MobileHeader title="Gestione" icon="storefront-outline" />
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>

        <Tabs value={generalTab} onValueChange={setGeneralTab}>
            <TabsList className="flex-row items-center mb-6">
              <TabsTrigger value="users" className="flex-1">
                <Text className="font-medium">👥 Utenti</Text>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex-1">
                <Text className="font-medium">🍕 Prodotti</Text>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="users">
              <View className="flex flex-col items-start justify-between gap-6 w-full mb-20">
                <View className="flex flex-row items-center justify-between w-full">
                  <View>
                    <Text className="text-3xl font-bold text-gray-900">Gestione Utenti</Text>
                    <Text className="text-gray-500 mt-1">Gestisci tutti gli utenti registrati</Text>
                  </View>
                  <View className="bg-primary/10 px-4 py-2 rounded-xl flex flex-col items-end justify-between">
                    <Text className="text-sm font-bold text-primary">{users.length}</Text>
                    <Text className="text-primary text-sm">utenti</Text>
                  </View>
                </View>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="flex-row items-center mb-6 w-full">
                    <TabsTrigger className="flex-1" value="admin">
                      <Text>Amministratori</Text>
                    </TabsTrigger>
                    <TabsTrigger className="flex-1" value="client">
                      <Text>Clienti</Text>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="admin" className="flex flex-col items-start justify-between gap-4 w-full">
                    {users.filter(user => user.role === 'admin').map((user) => (
                      <UserCard 
                        user={user}
                        key={user.id}
                        deletingUsers={deletingUsers}
                        handleDeleteUser={handleDeleteUser}
                        getReputationText={getReputationText}
                        session={session}
                      />
                    ))}
                  </TabsContent>
                  <TabsContent value="client" className="flex flex-col items-start justify-between gap-4 w-full">
                    {users.filter(user => user.role !== 'admin').map((user) => (
                      <UserCard 
                        user={user}
                        key={user.id}
                        deletingUsers={deletingUsers}
                        handleDeleteUser={handleDeleteUser}
                        getReputationText={getReputationText}
                        session={session}
                      />
                    ))}
                  </TabsContent>
                </Tabs>
            </View>
          </TabsContent>
          <TabsContent value="products">
            <View className="flex flex-col items-start justify-between gap-6 w-full mb-20">
              <View className="flex flex-row items-center justify-between w-full mb-6">
                <View>
                  <Text className="text-3xl font-bold text-gray-900">Gestione Prodotti</Text>
                  <Text className="text-gray-500 mt-1">Analizza le performance dei tuoi prodotti</Text>
                </View>
                <View className="bg-primary/10 px-4 py-2 rounded-xl flex flex-col items-end justify-between">
                  <Text className="text-sm text-primary font-bold">{allProducts.length}</Text>
                  <Text className="text-sm text-primary">prodotti</Text>
                </View>
              </View>
              
              {allProducts.length === 0 ? (
                <View className="items-center py-12 w-full">
                  <View className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Text className="text-gray-400 text-2xl">🍕</Text>
                  </View>
                  <Text className="text-gray-500 text-lg font-medium">Nessun prodotto trovato</Text>
                  <Text className="text-gray-400 text-sm mt-1">Aggiungi prodotti per iniziare</Text>
                </View>
              ) : (
                <View className="flex flex-col gap-y-2 w-full">
                  {allProducts.map((product: ProductProps | SpianataProps, index: number) => (
                    <ProductCard 
                      product={product} 
                      key={`${product.id || index}`} 
                      type={getProductType(product) || ''} 
                      setShowInfo={handleShowInfo} 
                      isSelected={selectedProduct?.id === product.id}
                      isTopProduct={isTopProduct(product.id, analyticsData as AnalyticsData)}
                      topProductPosition={getTopProductPosition(product.id, analyticsData as AnalyticsData)}
                    />
                  ))}
                </View>
              )}
            </View>
          </TabsContent>
        </Tabs>
        <CustomBottomSheet
          bottomSheetRef={bottomSheetRef}
          snapPoints={snapPoints}
          renderBackdrop={renderBackdrop}
          onDismiss={() => {
            printLog('Bottom sheet dismissed');
            bottomSheetRef.current?.dismiss();
          }}
          index={0}
        >
          <BottomSheetScrollView className="flex-1 px-6 py-4">
            <View className="flex flex-col items-start justify-between gap-6 w-full mb-20">
              {selectedProduct && (
                <>
                  {/* Product Header with Image */}
                  <View className="flex flex-row items-start justify-between gap-4 w-full">
                    <View className="flex-1">
                      <View className="flex flex-row items-center gap-2 mb-2">
                        <View className="px-3 py-1 bg-blue-100 rounded-full">
                          <Text className="text-blue-700 font-medium text-xs">
                            {getProductType(selectedProduct)}
                          </Text>
                        </View>
                        {isTopProduct(selectedProduct.id, analyticsData as AnalyticsData) && (
                          <View className="px-2 py-1 bg-yellow-100 rounded-full">
                            <Text className="text-yellow-700 font-medium text-xs">🔥 Top</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-2xl font-bold text-gray-900 mb-1">
                        {selectedProduct.name}
                      </Text>
                      <Text className="text-3xl font-bold text-green-600 mb-3">
                        €{selectedProduct.price}
                      </Text>
                      <Text className="text-gray-600 leading-6">
                        {selectedProduct.description} 
                      </Text>
                    </View>
                    
                    <View className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg">
                      <Image
                        source={{ uri: selectedProduct.image }}
                        className="w-full h-full"
                        width={96}
                        height={96}
                        resizeMode='cover'
                      />
                    </View>
                  </View>
                  
                  {/* Separator */}
                  <View className="w-full h-px bg-gray-200" />
                  
                  {/* Product Analytics */}
                  <View className="w-full flex flex-col gap-y-2">
                    <View className="flex flex-row items-center gap-2 mb-4">
                      <View className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Text className="text-blue-600 font-bold text-sm">📊</Text>
                      </View>
                      <Text className="text-xl font-bold text-gray-900">
                        Analitiche Prodotto
                      </Text>
                    </View>
                    
                    <View className="flex flex-row items-center justify-between gap-3">
                      <View className="w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                        <View className="flex flex-row items-center gap-2 mb-1">
                          <Text className="text-blue-600 text-lg">📦</Text>
                          <Text className="text-blue-700 font-medium text-sm">Ordini</Text>
                        </View>
                        <Text className="text-2xl font-bold text-blue-900">
                          {productAnalytics?.totalOrders || 0}
                        </Text>
                      </View>
                      
                      <View className="w-1/2 bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                        <View className="flex flex-row items-center gap-2 mb-1">
                          <Text className="text-green-600 text-lg">💰</Text>
                          <Text className="text-green-700 font-medium text-sm">Fatturato</Text>
                        </View>
                        <Text className="text-2xl font-bold text-green-900">
                          €{(productAnalytics?.totalRevenue || 0).toFixed(2)}
                        </Text>
                      </View>
                      
                    </View>
                    <View className="flex flex-row items-center justify-between gap-3">
                      <View className="w-1/2 bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                        <View className="flex flex-row items-center gap-2 mb-1">
                          <Text className="text-purple-600 text-lg">📈</Text>
                          <Text className="text-purple-700 font-medium text-sm">Quantità</Text>
                        </View>
                        <Text className="text-2xl font-bold text-purple-900">
                          {productAnalytics?.totalQuantity || 0}
                        </Text>
                      </View>
                      
                      <View className="w-1/2 bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                        <View className="flex flex-row items-center gap-2 mb-1">
                          <Text className="text-orange-600 text-lg">📊</Text>
                          <Text className="text-orange-700 font-medium text-sm">% Fatturato</Text>
                        </View>
                        <Text className="text-2xl font-bold text-orange-900">
                          {productAnalytics?.revenueShare?.toFixed(1) || 0}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Performance Indicator */}
                  {productAnalytics && (
                    <View className="w-full bg-gray-50 rounded-xl p-4">
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Performance: {productAnalytics.revenueShare?.toFixed(1) || 0}%
                      </Text>
                      <View className="flex flex-row items-center gap-2">
                        <Progress value={productAnalytics.revenueShare || 0}  />
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </BottomSheetScrollView>
        </CustomBottomSheet>
      </ScrollView>
    </SafeAreaView>
  );
}


const UserCard = ({ 
  user,
  deletingUsers,
  handleDeleteUser,
  getReputationText,
  session
} : { 
  user: UserProps,
  deletingUsers: Set<string>,
  handleDeleteUser: (user: UserProps) => void,
  getReputationText: (score: number) => string,
  session: Session | null
}) => {

  if (user.role === 'admin') {
    return (
      <View className="flex flex-col w-full">
        <Card className="w-full">
          <CardHeader className="w-full">
            <CardTitle className="flex flex-row items-center justify-between w-full">
              <View className="flex flex-row items-center gap-3">
                <View className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <Text className="text-white font-semibold text-lg">
                    {getInitials(user.name || user.email || 'Utente')}
                  </Text>
                </View>
                <View>
                  <Text className="text-lg font-semibold text-gray-900">
                    {checkIsUser(user.id, session) ? 'Tu' : user.name || 'Utente senza nome'}
                  </Text>
                  <Text className="text-sm text-gray-500">{user.email || 'N/A'}</Text>
                </View>
              </View>
              <View className="px-3 py-1 bg-gray-100 rounded-full">
                <Text className="text-xs font-medium text-gray-600">Admin</Text>
              </View>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <View className="flex flex-row items-center gap-3">
              <Ionicons name="mail-outline" size={20} color="gray" />
              <Text className="text-sm text-gray-600">{user.email || 'N/A'}</Text>
            </View>
            <View className="flex flex-row items-center gap-3">
              <Ionicons name="call-outline" size={20} color="gray" />
              <Text className="text-sm text-gray-600">{user.phone || 'N/A'}</Text>
            </View>
            <View className="flex flex-row items-center gap-3">
              <Ionicons name="star-outline" size={20} color="gray" />
              <Text className="text-sm text-gray-600">
                Reputazione: {getReputationText(user.reputation_score)}
              </Text>
            </View>
            <View className="flex flex-row items-center gap-3">
              <Ionicons name="calendar-outline" size={20} color="gray" />
              <Text className="text-sm text-gray-600">
                Utente da: {new Date(user.created_at).toLocaleDateString('it-IT', {
                  month: '2-digit',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </CardContent>
          <CardFooter>
            {checkIsUser(user.id, session) ? (
              <Button
                text="Elimina"
                variant="bordered"                
                onPress={() => {}}
                disabled={true}
                className="w-full"
              />
            ) : (
              <Button
                text={deletingUsers.has(user.id) ? 'Eliminando...' : 'Elimina'}
                variant="destructive"
                onPress={() => handleDeleteUser(user)}
                disabled={deletingUsers.has(user.id)}
                className="w-full"
              />
            )}
          </CardFooter>
        </Card>
      </View>
    )
  }

  // Customer user card
  return (
    <View className="flex flex-col w-full">
      <Card className="w-full">
        <CardHeader className="w-full">
          <CardTitle className="flex flex-row items-center justify-between w-full">
            <View className="flex flex-row items-center gap-3">
              <View className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Text className="text-white font-semibold text-lg">
                  {getInitials(user.name || user.email || 'Utente')}
                </Text>
              </View>
              <View>
                <Text className="text-lg font-semibold text-gray-900">
                  {user.name || 'Utente senza nome'}
                </Text>
                <Text className="text-sm text-gray-500">{user.email || 'N/A'}</Text>
              </View>
            </View>
            <View className={`px-3 py-1 rounded-full ${
              user.reputation_score === 0 ? 'bg-gray-100' :
              user.reputation_score > 0 ? 'bg-green-100' :
              'bg-red-100'
            }`}>
              <Text className={`text-xs font-medium ${
                user.reputation_score === 0 ? 'text-gray-600' :
                user.reputation_score > 0 ? 'text-green-700' :
                'text-red-700'
              }`}>
                {getReputationText(user.reputation_score)}
              </Text>
            </View>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <View className="flex flex-row items-center gap-3">
            <Ionicons name="mail-outline" size={20} color="gray" />
            <Text className="text-sm text-gray-600">{user.email || 'N/A'}</Text>
          </View>
          <View className="flex flex-row items-center gap-3">
            <Ionicons name="call-outline" size={20} color="gray" />
            <Text className="text-sm text-gray-600">{user.phone || 'N/A'}</Text>
          </View>
          <View className="flex flex-row items-start gap-3">
            <Ionicons name="location-outline" size={20} color="gray" style={{ marginTop: 2 }} />
            <Text className="text-sm text-gray-600 flex-1">{user.address || 'N/A'}</Text>
          </View>
          <View className="flex flex-row items-center gap-3">
            <Ionicons name="calendar-outline" size={20} color="gray" />
            <Text className="text-sm text-gray-600">
              Registrato: {new Date(user.created_at).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>
        </CardContent>
        <CardFooter>
          <Button
            text={deletingUsers.has(user.id) ? 'Eliminando...' : 'Elimina utente'}
            variant="destructive"
            onPress={() => handleDeleteUser(user)}
            disabled={deletingUsers.has(user.id)}
            className="w-full"
          />
        </CardFooter>
      </Card>
    </View>
  )
}