import PhoneInputComponent from "@/components/phone-input";
import Button from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import {
  CalendarDays,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserRound
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MobileHeader from "@/components/(private)/(admin)/mobile-header";
import AutocompleteInput from "@/components/(private)/(customer)/autocomplete-input";
import { PhoneVerification } from "@/components/(private)/(customer)/phone-verification";
import PageHeader from "@/components/(private)/page-header";
import PrivateLayout from "@/components/(private)/private-layout";
import PasswordInput from "@/components/ui/password-input";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getPaymentMethodName, printLog } from "@/lib/utils";
import { SafeAreaView } from "react-native-safe-area-context";
import Loader from "../../../components/ui/Loader";
import { useAuth } from "../../../contexts/auth-context";
import { createClientSupabase } from "../../../lib/supabase";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";

export default function Profile() {
  // Usa la stessa istanza del client
  const supabaseClient = useMemo(() => {
    const client = createClientSupabase();
    if (!client) {
      throw new Error('Failed to initialize Supabase client');
    }
    return client;
  }, []);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const { session, signOut, deleteUser } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();
  const router = useRouter();
  const { returnTo, orderData } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [groupedData, setGroupedData] = useState<any>({});
  const [lastPayments, setLastPayments] = useState<any[]>([]);
  const [lastCharges, setLastCharges] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  const [tab, setTab] = useState("profile");
  const [paymentTab, setPaymentTab] = useState("intents");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phoneChanged, setPhoneChanged] = useState(false);
  // Aggiunto stato per validazione indirizzo
  const [addressValid, setAddressValid] = useState(true);
  const [addressErrorMessage, setAddressErrorMessage] = useState<string>("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPasswordVisible: false,
    newPasswordVisible: false,
    confirmPasswordVisible: false,
  });

  useEffect(() => {
    if (!session) {
      router.push("/");
      return;
    }
  }, [session, router]);

  // Populate formData when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });
      setLoading(false);
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await signOut();
      // Il redirect viene gestito automaticamente dai layout
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Errore", "Impossibile disconnettersi");
    }
  };

  const handleSave = async () => {
    // Chiudi la tastiera
    Keyboard.dismiss();
    
    if (!session) {
      return;
    }

    setIsSaving(true);
    setSaved(false);

    try {
      const updateData: any = {
        name: formData.name,
        address: formData.address,
      };

      // Solo aggiornare il telefono se è cambiato
      if (phoneChanged) {
        updateData.phone = formData.phone;
        updateData.phone_verified = false;
      }

      // Prima verifichiamo se la riga esiste e possiamo leggerla
      const { data: checkData, error: checkError } = await supabaseClient
        .from("users")
        .select("id, name, address, phone")
        .eq("id", session.user.id)
        .single();
      
      // Test di autenticazione
      const { data: authData, error: authError } = await supabaseClient.auth.getUser();
      
      // Test RLS con auth.uid()
      const { data: rlsData, error: rlsError } = await supabaseClient
        .from("users")
        .select("id, name, address, phone")
        .eq("id", authData?.user?.id || session.user.id)
        .single();
      

      let { data, error } = await supabaseClient
        .from("users")
        .update(updateData)
        .eq("id", session.user.id)
        .select(); // Aggiungiamo select() per vedere i dati aggiornati

      if (error) {
        console.error("❌ Errore aggiornamento:", error);
        throw error;
      }

      // Se l'aggiornamento non ha modificato nessuna riga, prova con supabaseAdmin
      if (!data || data.length === 0) {
        const adminClient = supabaseAdmin();
        if (!adminClient) {
          throw new Error('Failed to initialize Supabase admin client');
        }
        
        const { data: adminData, error: adminError } = await adminClient
          .from("users")
          .update(updateData)
          .eq("id", session.user.id)
          .select();
        
        if (adminError) {
          console.error("❌ Errore aggiornamento admin:", adminError);
          throw adminError;
        }
        
        data = adminData;
      }

      // Aggiorna il profilo locale
      const updatedProfile = {
        ...profile,
        ...updateData,
      };

      setSaved(true);
      setPhoneChanged(false);

      // Check if we should return to checkout
      if (returnTo === "checkout" && orderData) {
        // Wait a moment for the save to complete, then redirect
        setTimeout(() => {
          const encodedOrderData = encodeURIComponent(orderData as string);
          router.push(`/checkout?orderData=${encodedOrderData}`);
        }, 1000);
      } else {
        setTimeout(() => {
          setSaved(false);
        }, 3000);
      }
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      Alert.alert("Errore", "Impossibile salvare le modifiche");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordChangeMessage({
        type: "error",
        text: "Le password non corrispondono",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordChangeMessage({
        type: "error",
        text: "La password deve essere lunga almeno 6 caratteri",
      });
      return;
    }

    setIsChangingPassword(true);
    setPasswordChangeMessage(null);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        setPasswordChangeMessage({
          type: "error",
          text: "Errore durante il cambio password",
        });
      } else {
        setPasswordChangeMessage({
          type: "success",
          text: "Password cambiata con successo",
        });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      setPasswordChangeMessage({
        type: "error",
        text: "Errore durante il cambio password",
      });
    } finally {
      setIsChangingPassword(false);
      signOut();
    }
  };


  const getPaymentMethods = async () => {
    setIsLoadingPaymentMethods(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081';
      const response = await fetch(`${baseUrl}/api/stripe/get-payment-methods`, {
        method: "POST",
        body: JSON.stringify({ customerId: profile?.stripe_customer_id }),
      });

      const data = await response.json();
      
      if (data.error) {
        console.error("Error fetching payment data:", data.error);
        return;
      }
      
      setGroupedData(data.grouped || {});
      setLastPayments(data.lastPayments || []);
      setLastCharges(data.lastChargesWithoutPaymentIntent || []);
      setPaymentMethods(data.paymentMethods || []);
      setSubscriptions(data.subscriptions || []);
      setPaymentSummary(data.summary || null);
      

    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  }

  useEffect(() => {
    if (profile) {
      getPaymentMethods();
    }
  }, [profile]);

  if (loading) {
    return <Loader size="fullscreen" text="Caricamento profilo..." />;
  }

  const createdAt = profile?.created_at
    ? format(new Date(profile.created_at), "d MMMM yyyy", { locale: it })
    : "N/A";

  if (Platform.OS === "web") {
    return (
      <PrivateLayout title="Il tuo profilo | Pizzaurum" description="Il tuo profilo">
        {/* Return to Checkout Banner */}
        {returnTo === "checkout" && orderData && (
          <div className="bg-blue-50 border-b border-blue-200">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Completa il tuo profilo</span> per continuare con l'ordine
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        <section className="max-w-7xl mx-auto w-full px-4 py-8">
          <PageHeader title="Il tuo profilo" description="Gestisci il tuo profilo" />
          <Separator className="my-4" />
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card className="shadow-md h-fit">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Il tuo account</CardTitle>
                    <CardDescription>Riepilogo e informazioni</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center text-center space-y-4 mt-2">
                    <div className="relative">
                      <div className="h-32 w-32 rounded-full bg-gradient-to-tl from-primary/30 via-primary to-primary/70 flex items-center justify-center text-white text-3xl font-bold">
                        {getInitials(formData.name || profile?.email || "")}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">
                        {formData.name || "Utente"}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {profile?.email || authUser?.email}
                      </p>
                    </div>

                    <Separator />

                    <div className="w-full space-y-3 pt-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Cliente dal {createdAt}
                        </span>
                      </div>

                      {formData.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground truncate">
                            {formData.address}
                          </span>
                        </div>
                      )}

                      {formData.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formData.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

              </div>

              <div className="md:col-span-2">
                <Tabs
                  value={tab}
                  onValueChange={(value) => setTab(value)}
                  className="w-full"
                >
                  <TabsList className="flex-row mb-4">
                    <TabsTrigger className="flex-1" value="profile">
                      <Text>Profilo</Text>
                    </TabsTrigger>
                    <TabsTrigger className="flex-1" value="preferences">
                      <Text>Sicurezza</Text>
                    </TabsTrigger>
                    <TabsTrigger className="flex-1" value="payments">
                      <Text>Pagamenti</Text>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile">
                    <Card className="shadow-md">
                      <CardHeader className="gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/20 rounded-md p-1.5">
                            <UserRound className="h-5 w-5 text-primary" />
                          </span>
                          <CardTitle className="text-xl">
                            Informazioni personali
                          </CardTitle>
                        </div>
                        <CardDescription>
                          Aggiorna i tuoi dati personali e di contatto. Alcuni
                          dati non possono essere modificati. Telefono e
                          indirizzo ci servono per consegnare i tuoi ordini.
                        </CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <label className="text-sm font-medium">Email</label>
                          </div>
                          <div className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
                            {profile?.email || authUser?.email}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            L'email non può essere modificata
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                            <label
                              htmlFor="name"
                              className="text-sm font-medium"
                            >
                              Nome
                            </label>
                          </div>
                          <Input
                            id="name"
                            placeholder="Il tuo nome"
                            value={formData.name}
                            onChangeText={(text) =>
                              setFormData((prev) => ({
                                ...prev,
                                name: text,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <label
                              htmlFor="phone"
                              className="text-sm font-medium"
                            >
                              Telefono
                            </label>
                            {profile?.phone_verified && (
                              <div className="flex items-center gap-1 text-green-600 text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                Verificato
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <PhoneInputComponent
                              isVerified={profile?.phone_verified}
                              value={formData.phone}
                              onChangePhone={(phone) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  phone: phone,
                                }));
                                setPhoneChanged(
                                  phone !== (profile?.phone || "")
                                );
                              }}
                            />
                            {formData.phone &&
                              (!profile?.phone_verified || phoneChanged) && (
                                <Button
                                  className="w-full"
                                  onPress={() => setShowPhoneVerification(true)}
                                  text="Verifica numero di telefono"
                                  variant="primary"
                                />
                              )}
                            {phoneChanged && (
                              <p className="text-xs text-orange-600">
                                Hai modificato il numero di telefono. È
                                necessario verificarlo nuovamente.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <label
                              htmlFor="address"
                              className="text-sm font-medium"
                            >
                              Indirizzo
                            </label>
                          </div>
                          
                          <AutocompleteInput
                            value={formData.address}
                            onChange={(text) => {
                              setFormData((prev) => ({
                                ...prev,
                                address: text,
                              }));
                            }}
                            placeholder="Inserisci il tuo indirizzo"
                            onAddressSelect={(address, placeId) => {
                              setFormData((prev) => {
                                const newData = { ...prev, address: address };
                                return newData;
                              });
                            }}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 z-0">
                        {(() => {
                          const isDisabled = isSaving || saved;
                          return (
                            <Button
                              onPress={() => {
                                handleSave();
                              }}
                              disabled={isDisabled}
                              text={
                                isSaving
                                  ? "Salvataggio..."
                                  : saved
                                  ? "Salvato"
                                  : "Salva"
                              }
                              variant="primary"

                            />
                          );
                        })()}
                      </CardFooter>
                    </Card>
                  </TabsContent>

                  <TabsContent value="preferences">
                    <Card className="shadow-md">
                      <CardHeader className="gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/20 rounded-md p-1.5">
                            <Shield className="h-5 w-5 text-primary" />
                          </span>
                          <CardTitle className="text-xl">
                            Sicurezza dell'account
                          </CardTitle>
                        </div>
                        <CardDescription>
                          Cambia la password dell'account. Ricorda che Pizzaurum
                          non ha accesso ai tuoi dati personali, se non per
                          quelli necessari per il funzionamento del servizio.
                        </CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6 space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">
                            Cambia Password
                          </h3>

                          {passwordChangeMessage && (
                            <div
                              className={`p-3 rounded-md text-sm ${
                                passwordChangeMessage.type === "success"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {passwordChangeMessage.text}
                            </div>
                          )}

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label
                                htmlFor="currentPassword"
                                className="text-sm font-medium"
                              >
                                Password corrente
                              </label>
                              <PasswordInput
                                id="currentPassword"
                                password={passwordData.currentPassword}
                                setPassword={(text) =>
                                  setPasswordData((prev) => ({
                                    ...prev,
                                    currentPassword: text,
                                  }))
                                }
                                showPassword={
                                  passwordVisibility.currentPasswordVisible
                                }
                                togglePasswordVisibility={() =>
                                  setPasswordVisibility((prev) => ({
                                    ...prev,
                                    currentPasswordVisible:
                                      !prev.currentPasswordVisible,
                                  }))
                                }
                                placeholder="Inserisci la password corrente"
                              />
                            </div>

                            <div className="space-y-2">
                              <label
                                htmlFor="newPassword"
                                className="text-sm font-medium"
                              >
                                Nuova password
                              </label>
                              <PasswordInput
                                id="newPassword"
                                password={passwordData.newPassword}
                                setPassword={(text) =>
                                  setPasswordData((prev) => ({
                                    ...prev,
                                    newPassword: text,
                                  }))
                                }
                                showPassword={
                                  passwordVisibility.newPasswordVisible
                                }
                                togglePasswordVisibility={() =>
                                  setPasswordVisibility((prev) => ({
                                    ...prev,
                                    newPasswordVisible:
                                      !prev.newPasswordVisible,
                                  }))
                                }
                                placeholder="Inserisci la nuova password"
                              />
                              <p className="text-xs text-muted-foreground">
                                La password deve essere lunga almeno 6 caratteri
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label
                                htmlFor="confirmPassword"
                                className="text-sm font-medium"
                              >
                                Conferma nuova password
                              </label>
                              <PasswordInput
                                id="confirmPassword"
                                password={passwordData.confirmPassword}
                                setPassword={(text) =>
                                  setPasswordData((prev) => ({
                                    ...prev,
                                    confirmPassword: text,
                                  }))
                                }
                                showPassword={
                                  passwordVisibility.confirmPasswordVisible
                                }
                                togglePasswordVisibility={() =>
                                  setPasswordVisibility((prev) => ({
                                    ...prev,
                                    confirmPasswordVisible:
                                      !prev.confirmPasswordVisible,
                                  }))
                                }
                                placeholder="Conferma la nuova password"
                              />
                            </div>

                            <div className="border border-red-400 bg-red-100 rounded-xl p-4 flex flex-row items-center justify-between">
                              <hgroup>
                                <h2 className="text-red-700 font-black">Elimina account</h2>
                                <h3 className="text-red-500 text-sm">
                                  Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.
                                </h3>
                              </hgroup>
                              <Button
                                text="Elimina account"
                                variant="destructive"
                                onPress={() => {
                                  Alert.alert("Elimina account", "Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.", [
                                    { text: "Annulla", style: "cancel" },
                                    { text: "Elimina", onPress: () => {
                                      deleteUser(session?.user.id || "");
                                    } },
                                  ]);
                                }}
                              />
                            </div>

                            <div className="flex justify-end pt-2">
                              <Button
                                onPress={handlePasswordChange}
                                text={
                                  isChangingPassword
                                    ? "Cambio in corso..."
                                    : "Cambia Password"
                                }
                                variant="primary"
                                disabled={
                                  isChangingPassword ||
                                  !passwordData.newPassword ||
                                  !passwordData.confirmPassword
                                }
                                className="w-fit"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="payments">
                    <Card className="shadow-md">
                      <CardHeader className="gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/20 rounded-md p-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                              <rect width="20" height="14" x="2" y="5" rx="2" />
                              <line x1="2" x2="22" y1="10" y2="10" />
                            </svg>
                          </span>
                          <CardTitle className="text-xl">
                            Storico pagamenti
                          </CardTitle>
                        </div>
                        <CardDescription>
                          Visualizza tutti i pagamenti effettuati con il tuo account Pizzaurum.
                        </CardDescription>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-6">
                        {paymentSummary && (
                          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-blue-700 font-medium">Totale speso</p>
                              <p className="text-2xl font-bold text-blue-900">{paymentSummary.totalSpent?.toFixed(2)}€</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-green-700 font-medium">Pagamenti effettuati</p>
                              <p className="text-2xl font-bold text-green-900">{paymentSummary.successfulPayments}</p>
                            </div>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <p className="text-orange-700 font-medium">Rimborsi</p>
                              <p className="text-2xl font-bold text-orange-900">{paymentSummary.refundedPayments || 0}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-amber-700 font-medium">Carte salvate</p>
                              <p className="text-2xl font-bold text-amber-900">{paymentSummary.savedCards}</p>
                            </div>
                          </div>
                        )}
                        
                        <Tabs value={paymentTab} onValueChange={setPaymentTab}>
                          <TabsList className="mb-4 w-full flex-row">
                            <TabsTrigger value="intents" className="flex-1">
                              <Text>Pagamenti</Text>
                            </TabsTrigger>
                            {paymentMethods.length > 0 && (
                              <TabsTrigger value="methods" className="flex-1">
                                <Text>Metodi</Text>
                              </TabsTrigger>
                            )}
                          </TabsList>
                          
                          <TabsContent value="intents">
                            <div className="space-y-4">
                              <div className="rounded-xl border">
                                <div className="bg-muted/50 p-4 grid grid-cols-5 font-medium">
                                  <div className="col-span-1">Data</div>
                                  <div className="col-span-1">Importo</div>
                                  <div className="col-span-1">Stato</div>
                                  <div className="col-span-1">Metodo</div>
                                  <div className="col-span-1">Ordine</div>
                                </div>
                                <div className="divide-y">
                                  {isLoadingPaymentMethods ? (
                                    <div className="p-4 text-center">
                                      <p>Caricamento...</p>
                                    </div>
                                  ) : (
                                    (() => {
                                      return lastPayments.length > 0 ? 
                                        lastPayments.map((payment, index) => (
                                          <div key={payment.id} className="p-4 grid grid-cols-5 items-center hover:bg-muted/30">
                                            <div className="col-span-1 text-sm">
                                              {new Date(payment.created * 1000).toLocaleDateString('it-IT')}
                                            </div>
                                            <div className="col-span-1 text-sm font-medium">
                                              {(payment.amount / 100).toFixed(2)}€
                                            </div>
                                            <div className="col-span-1">
                                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                payment.status === 'succeeded' && !payment.refunded ? 'bg-green-100 text-green-800' :
                                                payment.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                payment.status === 'requires_payment_method' ? 'bg-yellow-100 text-yellow-800' :
                                                payment.status === 'canceled' ? 'bg-red-100 text-red-800' :
                                                payment.status === 'refunded' || payment.refunded ? 'bg-orange-100 text-orange-800' :
                                                'bg-gray-100 text-gray-800'
                                              }`}>
                                                {payment.refunded || payment.status === 'refunded' ? 'Rimborsato' : 'Pagato'}
                                              </span>
                                            </div>
                                            <div className="col-span-1 text-sm">
                                              {getPaymentMethodName(payment.payment_method_types?.[0] || '')}
                                            </div>
                                            <div className="col-span-1 text-sm">
                                              {payment.order && payment.order.link ? (
                                                <Link href={payment.order.link} className="text-blue-600 hover:text-blue-800 underline underline-offset-2">
                                                  Visualizza Ordine
                                                </Link>
                                              ) : (
                                                <span className="text-gray-400">N/A</span>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      : 
                                        <div className="p-8 text-center">
                                          <p className="text-muted-foreground">Nessun pagamento trovato</p>
                                        </div>
                                    })()
                                  )}
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="methods">
                            <div className="space-y-4">
                              <div className="rounded-md border">
                                <div className="bg-muted/50 p-4 grid grid-cols-4 font-medium">
                                  <div className="col-span-1">Tipo</div>
                                  <div className="col-span-1">Ultima parte</div>
                                  <div className="col-span-1">Scadenza</div>
                                  <div className="col-span-1">Emittente</div>
                                </div>
                                <div className="divide-y">
                                  {paymentMethods.length > 0 ? 
                                    paymentMethods.map((method, index) => (
                                      <div key={method.id} className="p-4 grid grid-cols-4 items-center hover:bg-muted/30">
                                        <div className="col-span-1 text-sm flex items-center gap-2">
                                          {method.card?.brand === 'visa' && <span className="text-blue-600 font-bold">VISA</span>}
                                          {method.card?.brand === 'mastercard' && <span className="text-red-600 font-bold">MC</span>}
                                          {method.card?.brand === 'amex' && <span className="text-blue-800 font-bold">AMEX</span>}
                                          {method.card?.brand === 'discover' && <span className="text-orange-600 font-bold">Discover</span>}
                                          {method.card?.brand === 'diners' && <span className="text-gray-700 font-bold">Diners</span>}
                                          {method.card?.brand === 'jcb' && <span className="text-green-600 font-bold">JCB</span>}
                                          {method.card?.brand === 'unionpay' && <span className="text-red-800 font-bold">UnionPay</span>}
                                          {!['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay'].includes(method.card?.brand || '') && 
                                            <span className="font-bold capitalize">{method.card?.brand || method.type}</span>
                                          }
                                          <span>{method.card?.funding === 'credit' ? 'Credito' : 'Debito'}</span>
                                        </div>
                                        <div className="col-span-1 text-sm font-medium">
                                          •••• {method.card?.last4 || '****'}
                                        </div>
                                        <div className="col-span-1 text-sm">
                                          {method.card?.exp_month}/{method.card?.exp_year}
                                        </div>
                                        <div className="col-span-1 text-sm capitalize">
                                          {method.card?.wallet?.type || 'carta fisica'}
                                        </div>
                                      </div>
                                    ))
                                  : 
                                    <div className="p-8 text-center">
                                      <p className="text-muted-foreground">Nessuna carta salvata</p>
                                    </div>
                                  }
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </section>

        {/* Phone Verification Dialog - Root Level */}
        <Dialog
          open={showPhoneVerification}
          onOpenChange={(open) => !open && setShowPhoneVerification(false)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verifica numero di telefono
              </DialogTitle>
              <DialogDescription>
                Inserisci il tuo numero di telefono per ricevere un codice di
                verifica
              </DialogDescription>
            </DialogHeader>
            <PhoneVerification
              os={Platform.OS}
              isOpen={showPhoneVerification}
              onClose={() => setShowPhoneVerification(false)}
              onVerified={async (verifiedPhone) => {
                // Verifica che la sessione sia valida
                if (!session?.user?.id) {
                  console.error("❌ No valid session found");
                  if (Platform.OS === "web") {
                    alert("Errore: sessione non valida. Effettua nuovamente il login.");
                  } else {
                    Alert.alert("Errore", "Sessione non valida. Effettua nuovamente il login.");
                  }
                  return;
                }
                
                try {
                  
                  // Prima facciamo una query di test per verificare che possiamo accedere al database
                  const { data: testData, error: testError } = await supabaseClient
                    .from("users")
                    .select("id, phone, phone_verified")
                    .eq("id", session.user.id)
                    .single();
                    
                  if (testError) {
                    console.error("❌ Test query failed:", testError);
                    throw new Error(`Database access test failed: ${testError.message}`);
                  }
                  
                  // Update the user's phone verification status in the database
                  const { data, error } = await supabaseClient
                    .from("users")
                    .update({
                      phone: verifiedPhone,
                      phone_verified: true,
                    })
                    .eq("id", session?.user.id)
                    .select(); // Aggiungiamo select() per vedere i dati aggiornati

                  if (error) {
                    console.error("❌ Database update error:", error);
                    
                    // Prova con supabaseAdmin come fallback
                    const adminClient = supabaseAdmin();
                    if (!adminClient) {
                      throw new Error('Failed to initialize Supabase admin client');
                    }
                    
                    const { data: adminData, error: adminError } = await adminClient
                      .from("users")
                      .update({
                        phone: verifiedPhone,
                        phone_verified: true,
                      })
                      .eq("id", session?.user.id)
                      .select();
                      
                    if (adminError) {
                      printLog(`❌ Admin fallback also failed: ${adminError}`, true);
                      throw adminError;
                    }
                    
                    printLog(`✅ Database updated successfully with admin client: ${adminData}`);
                  } else {
                    printLog(`✅ Database updated successfully: ${data}`);
                }

                // Update local state - the useUserProfile hook will handle this automatically
                setFormData((prev) => ({
                  ...prev,
                  phone: verifiedPhone,
                }));

                  setPhoneChanged(false);

                  // Show success message
                  if (Platform.OS === "web") {
                    alert("Numero di telefono verificato con successo!");
                  } else {
                    Alert.alert(
                      "Successo",
                      "Numero di telefono verificato con successo!"
                    );
                  }
                } catch (error) {
                  printLog(`❌ Error updating phone verification: ${error}`, true);
                  if (Platform.OS === "web") {
                    alert("Errore nell'aggiornamento del profilo");
                  } else {
                    Alert.alert(
                      "Errore",
                      "Errore nell'aggiornamento del profilo"
                    );
                  }
                }
              }}
              initialPhone={formData.phone || profile?.phone || ""}
            />
          </DialogContent>
        </Dialog>
      </PrivateLayout>
    );
  }

  // Mobile Layout
  return (
    <SafeAreaView className="flex-1 mb-10 bg-neutral-900">
      {/* Return to Checkout Banner - Mobile */}
      {returnTo === "checkout" && orderData && (
        <View className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="mr-3">
                <Text className="text-blue-400 text-lg">ℹ️</Text>
              </View>
              <Text className="text-sm text-blue-800 flex-1">
                <Text className="font-medium">Completa il tuo profilo</Text> per continuare con l'ordine
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const encodedOrderData = encodeURIComponent(orderData as string);
                router.push(`/checkout?orderData=${encodedOrderData}`);
              }}
              className="bg-blue-100 px-3 py-2 rounded-md"
            >
              <Text className="text-blue-800 text-sm font-medium">Torna al checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <MobileHeader
          title="Il tuo account"
          icon={<Ionicons name="person-outline" size={20} color="white" />}
        />
        <ScrollView
          className="flex-1 bg-white"
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Card replacement */}
          <View className="m-4 bg-white rounded-xl p-4">
            {/* CardHeader replacement */}
            <Text className="text-xl font-bold mb-2">Riepilogo e informazioni</Text>
            {/* CardContent replacement */}
            <View className="flex flex-col items-center mb-4">
              <View className="bg-primary/90 rounded-full p-8 my-2">
                <Text className="text-white text-2xl font-bold">
                  {getInitials(formData.name || profile?.email || "")}
                </Text>
              </View>
              <Text className="text-xl font-bold">
                {formData.name || "Utente"}
              </Text>
              <Text className="text-sm text-gray-500">
                {profile?.email || authUser?.email}
              </Text>
            </View>
            <View
              className="h-px bg-gray-200 my-4"
            />
            <View>
              <View className="flex flex-row items-center mb-2">
                <CalendarDays size={16} color="#888" />
                <Text className="text-sm text-gray-500 ml-2">
                  Cliente dal {createdAt}
                </Text>
              </View>
              {formData.address ? (
                <View className="flex flex-row items-center mb-2">
                  <MapPin size={16} color="#888" />
                  <Text
                    className="text-sm text-gray-500 ml-2"
                    numberOfLines={1}
                  >
                    {formData.address}
                  </Text>
                </View>
              ) : null}
              {formData.phone ? (
                <View className="flex flex-row items-center mb-2">
                  <Phone size={16} color="#888" />
                  <Text className="text-sm text-gray-500 ml-2">
                    {formData.phone}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Tabs per la versione mobile */}
          <Tabs value={tab} onValueChange={setTab} className="mx-4">
            <TabsList className="w-full flex-row">
              <TabsTrigger value="profile" className="flex-1 w-full"><Text>Profilo</Text></TabsTrigger>
              <TabsTrigger value="preferences" className="flex-1 w-full"><Text>Sicurezza</Text></TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 w-full"><Text>Pagamenti</Text></TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <View className="my-6">
                <View>
                  <Text className="text-xl font-bold mb-2">
                    Informazioni personali
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1 ">
                    Aggiorna i tuoi dati personali e di contatto. Alcuni dati non
                    possono essere modificati. Telefono e indirizzo ci servono per
                    consegnare i tuoi ordini.
                  </Text>
                </View>
                <View className="py-4">
                  {/* Email */}
                  <View className="mb-4">
                    <Text className="text-sm font-bold mb-1">Email</Text>
                    <Input
                      value={profile?.email || authUser?.email}
                      editable={false}
                      className="shadow-none"
                    />
                    <Text className="text-xs text-gray-500 mt-1">
                      L'email non può essere modificata
                    </Text>
                  </View>
                  {/* Nome */}
                  <View className="mb-4">
                    <Text className="text-sm font-bold mb-1">Nome</Text>
                    <Input
                      placeholder="Il tuo nome"
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, name: text }))
                      }
                    />
                  </View>
                  {/* Telefono */}
                  <View className="mb-4">
                    <Text className="text-sm font-bold mb-1">
                      Telefono{" "}
                      <Text className="text-xs ml-1 text-green-500">
                        {profile?.phone_verified ? "Verificato" : "Non verificato"}
                      </Text>
                    </Text>
                    <PhoneInputComponent
                      isVerified={profile?.phone_verified}
                      value={formData.phone}
                      onChangePhone={(phone) => {
                        setFormData((prev) => ({ ...prev, phone: phone }));
                        setPhoneChanged(phone !== (profile?.phone || ""));
                      }}
                    />
                    {formData.phone &&
                      (!profile?.phone_verified || phoneChanged) && (
                        <Button
                          className="w-full mt-2"
                          onPress={() => setShowPhoneVerification(true)}
                          text="Verifica numero di telefono"
                          variant="primary"
                        />
                      )}
                    {phoneChanged && (
                      <Text
                        style={{ color: "#e67e22", fontSize: 12, marginTop: 4 }}
                      >
                        Hai modificato il numero di telefono. È necessario
                        verificarlo nuovamente.
                      </Text>
                    )}
                  </View>
                  {/* Indirizzo */}
                  <View className="mb-4">
                    <Text className="text-sm font-bold mb-1">
                      Indirizzo
                    </Text>
                    <AutocompleteInput
                      className="text-sm"
                      placeholder="Inserisci il tuo indirizzo"
                      value={formData.address}
                      onChange={(text) => {
                        setFormData((prev) => ({ ...prev, address: text }));
                      }}
                      onAddressSelect={(address, placeId) => {
                        setFormData((prev) => {
                          const newData = { ...prev, address: address };
                          return newData;
                        });
                      }}
                    />
                  </View>
                  {/* Salva Button */}
                  {(() => {
                    const isDisabled = isSaving || saved;
                    return (
                      <Button
                        onPress={() => {
                          handleSave();
                        }}
                        className="w-full"
                        disabled={isDisabled}
                        text={isSaving ? "Salvataggio..." : saved ? "Salvato" : "Salva"}
                      />
                    );
                  })()}
                </View>
              </View>
            </TabsContent>
            <TabsContent value="preferences">
              <View className="my-6">
                <Text className="text-xl font-bold mb-4">Sicurezza dell'account</Text>
                <Text className="text-sm text-gray-500 mb-6">
                  Cambia la password dell'account. Ricorda che Pizzaurum
                  non ha accesso ai tuoi dati personali, se non per
                  quelli necessari per il funzionamento del servizio.
                </Text>
                
                <View className="space-y-4">
                  {passwordChangeMessage && (
                    <View
                      className={passwordChangeMessage.type === "success"
                        ? "bg-green-50 border border-green-200 p-3 rounded-md mb-2"
                        : "bg-red-50 border border-red-200 p-3 rounded-md mb-2"
                      }
                    >
                      <Text
                        className={passwordChangeMessage.type === "success"
                          ? "text-green-700 text-sm"
                          : "text-red-700 text-sm"
                        }
                      >
                        {passwordChangeMessage.text}
                      </Text>
                    </View>
                  )}
                  
                  <View className="space-y-2 mb-2">
                    <Text className="font-medium text-sm mb-1">Password corrente</Text>
                    <PasswordInput
                      id="currentPassword"
                      password={passwordData.currentPassword}
                      setPassword={(text) =>
                        setPasswordData((prev) => ({ ...prev, currentPassword: text }))
                      }
                      showPassword={passwordVisibility.currentPasswordVisible}
                      togglePasswordVisibility={() =>
                        setPasswordVisibility((prev) => ({
                          ...prev,
                          currentPasswordVisible: !prev.currentPasswordVisible,
                        }))
                      }
                      placeholder="Inserisci la password corrente"
                    />
                  </View>
                  
                  <View className="space-y-2 mb-2">
                    <Text className="font-medium text-sm mb-1">Nuova password</Text>
                    <PasswordInput
                      id="newPassword"
                      password={passwordData.newPassword}
                      setPassword={(text) =>
                        setPasswordData((prev) => ({ ...prev, newPassword: text }))
                      }
                      showPassword={passwordVisibility.newPasswordVisible}
                      togglePasswordVisibility={() =>
                        setPasswordVisibility((prev) => ({
                          ...prev,
                          newPasswordVisible: !prev.newPasswordVisible,
                        }))
                      }
                      placeholder="Inserisci la nuova password"
                    />
                    <Text className="text-xs text-gray-500">
                      La password deve essere lunga almeno 6 caratteri
                    </Text>
                  </View>
                  
                  <View className="space-y-2">
                    <Text className="font-medium text-sm mb-1">Conferma nuova password</Text>
                    <PasswordInput
                      id="confirmPassword"
                      password={passwordData.confirmPassword}
                      setPassword={(text) =>
                        setPasswordData((prev) => ({ ...prev, confirmPassword: text }))
                      }
                      showPassword={passwordVisibility.confirmPasswordVisible}
                      togglePasswordVisibility={() =>
                        setPasswordVisibility((prev) => ({
                          ...prev,
                          confirmPasswordVisible: !prev.confirmPasswordVisible,
                        }))
                      }
                      placeholder="Conferma la nuova password"
                    />
                  </View>
                  
                  <Button
                    onPress={handlePasswordChange}
                    text="Cambia Password"
                    variant="primary"
                    disabled={
                      isChangingPassword ||
                      !passwordData.newPassword ||
                      !passwordData.confirmPassword
                    }
                    className="w-full mt-4"
                  />
                  
                  <View className="mt-8 border border-red-400 bg-red-100 rounded-xl p-4">
                    <Text className="text-red-700 font-bold mb-2">Elimina account</Text>
                    <Text className="text-red-600 text-sm mb-4">
                      Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.
                    </Text>
                    <Button
                      text="Elimina account"
                      variant="destructive"
                      onPress={() => {
                        Alert.alert(
                          "Elimina account",
                          "Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.",
                          [
                            { text: "Annulla", style: "cancel" },
                            { text: "Elimina", onPress: () => deleteUser(session?.user.id || "") },
                          ]
                        );
                      }}
                    />
                  </View>
                </View>
              </View>
            </TabsContent>
            <TabsContent value="payments">
              <View className="my-6">
                <Text className="text-xl font-bold mb-4">Storico pagamenti</Text>
                <Text className="text-sm text-gray-500 mb-4">
                  Visualizza tutti i pagamenti effettuati con il tuo account Pizzaurum.
                </Text>
                
                {paymentSummary && (
                  <View className="mb-6 gap-y-3">
                    <View className="flex-row flex gap-x-3">
                      <View className=" flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Text className="text-blue-700 font-medium">Totale speso</Text>
                        <Text className="text-2xl font-bold text-blue-900">{paymentSummary.totalSpent?.toFixed(2)}€</Text>
                      </View>
                      <View className="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <Text className="text-amber-700 font-medium">Carte salvate</Text>
                        <Text className="text-xl font-bold text-amber-900">{paymentSummary.savedCards}</Text>
                      </View>
                    </View>
                    <View className="flex-row gap-x-3">
                      <View className=" flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                        <Text className="text-green-700 font-medium">Pagamenti</Text>
                        <Text className="text-xl font-bold text-green-900">{paymentSummary.successfulPayments}</Text>
                      </View>
                      <View className=" flex-1 bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <Text className="text-orange-700 font-medium">Rimborsi</Text>
                        <Text className="text-xl font-bold text-orange-900">{paymentSummary.refundedPayments || 0}</Text>
                      </View>
                    </View>
                  </View>
                )}
                
                <Tabs value={paymentTab} onValueChange={setPaymentTab}>
                  <TabsList className="flex flex-row">
                    <TabsTrigger value="intents" className="flex-1"><Text>Pagamenti</Text></TabsTrigger>
                    {paymentMethods.length > 0 && (
                      <TabsTrigger value="methods" className="flex-1"><Text>Carte salvate</Text></TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="intents">

                  </TabsContent>
                  {paymentMethods.length > 0 && (
                    <TabsContent value="methods">

                    </TabsContent>
                  )}
                </Tabs>
                
                {paymentTab === "intents" ? (
                  <View>
                    {lastPayments.length > 0 ? (
                      lastPayments.map((payment, index) => (
                        <View key={payment.id} className="border-b border-gray-200 py-3">
                          <View className="flex-row justify-between items-center">
                            <Text className="font-medium">{(payment.amount / 100).toFixed(2)}€</Text>
                            <View className={`py-1 px-2 rounded-full ${
                              payment.status === 'succeeded' && !payment.refunded ? 'bg-green-100' :
                              payment.status === 'processing' ? 'bg-blue-100' :
                              payment.status === 'requires_payment_method' ? 'bg-yellow-100' :
                              payment.status === 'canceled' ? 'bg-red-100' :
                              payment.status === 'refunded' || payment.refunded ? 'bg-orange-100' :
                              'bg-gray-100'
                            }`}>
                              <Text className={`text-xs font-medium ${
                                payment.status === 'succeeded' && !payment.refunded ? 'text-green-800' :
                                payment.status === 'processing' ? 'text-blue-800' :
                                payment.status === 'requires_payment_method' ? 'text-yellow-800' :
                                payment.status === 'canceled' ? 'text-red-800' :
                                payment.status === 'refunded' || payment.refunded ? 'text-orange-800' :
                                'text-gray-800'
                              }`}>
                                {payment.refunded || payment.status === 'refunded' ? 'Rimborsato' : 'Pagato'}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row justify-between mt-1">
                            <Text className="text-xs text-gray-500">
                              {new Date(payment.created * 1000).toLocaleDateString('it-IT')}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {getPaymentMethodName(payment.payment_method_types?.[0] || '') || 'N/A'}
                            </Text>
                          </View>
                          
                        </View>
                      ))
                    ) : (
                      <View className="py-8 items-center">
                        <Text className="text-gray-500">Nessun pagamento trovato</Text>
                      </View>
                    )}
                  </View>
                ) : paymentTab === "charges" ? (
                  <View>
                    {lastCharges.length > 0 ? (
                      lastCharges.map((charge, index) => (
                        <View key={charge.id} className="border-b border-gray-200 py-3">
                          <View className="flex-row justify-between items-center">
                            <Text className="font-medium">{(charge.amount / 100).toFixed(2)}€</Text>
                            <View className={`py-1 px-2 rounded-full ${
                              charge.status === 'succeeded' && !charge.refunded ? 'bg-green-100' :
                              charge.status === 'pending' ? 'bg-blue-100' :
                              charge.status === 'failed' ? 'bg-red-100' :
                              charge.status === 'refunded' || charge.refunded ? 'bg-orange-100' :
                              'bg-gray-100'
                            }`}>
                              <Text className={`text-xs font-medium ${
                                charge.status === 'succeeded' && !charge.refunded ? 'text-green-800' :
                                charge.status === 'pending' ? 'text-blue-800' :
                                charge.status === 'failed' ? 'text-red-800' :
                                charge.status === 'refunded' || charge.refunded ? 'text-orange-800' :
                                'text-gray-800'
                              }`}>
                                {charge.refunded || charge.status === 'refunded' ? 'rimborsato' : charge.status}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row justify-between mt-1">
                            <Text className="text-xs text-gray-500">
                              {new Date(charge.created * 1000).toLocaleDateString('it-IT')}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {charge.payment_method_details?.type || 'N/A'}
                            </Text>
                          </View>
                          {charge.description && (
                            <Text className="text-xs text-gray-500 mt-1">
                              {charge.description}
                            </Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <View className="py-8 items-center">
                        <Text className="text-gray-500">Nessun addebito trovato</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method, index) => (
                        <View key={method.id} className="border-b border-gray-200 py-3">
                          <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center space-x-2">
                              <Text className={
                                method.card?.brand === 'visa' ? "text-blue-600 font-bold" :
                                method.card?.brand === 'mastercard' ? "text-red-600 font-bold" :
                                method.card?.brand === 'amex' ? "text-blue-800 font-bold" :
                                "font-bold capitalize"
                              }>
                                {method.card?.brand === 'visa' && "VISA"}
                                {method.card?.brand === 'mastercard' && "MC"}
                                {method.card?.brand === 'amex' && "AMEX"}
                                {method.card?.brand === 'discover' && "Discover"}
                                {method.card?.brand === 'diners' && "Diners"}
                                {method.card?.brand === 'jcb' && "JCB"}
                                {method.card?.brand === 'unionpay' && "UnionPay"}
                                {!['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay'].includes(method.card?.brand || '') && 
                                  (method.card?.brand || method.type)
                                }
                              </Text>
                              <Text className="text-sm ml-2">•••• {method.card?.last4 || '****'}</Text>
                            </View>
                            <Text className="text-xs text-gray-500">
                              {method.card?.exp_month}/{method.card?.exp_year}
                            </Text>
                          </View>
                          <View className="flex-row justify-between mt-1">
                            <Text className="text-xs text-gray-500">
                              {method.card?.funding === 'credit' ? 'Carta di Credito' : 'Carta di Debito'}
                            </Text>
                            <Text className="text-xs text-gray-500 capitalize">
                              {method.card?.wallet?.type || 'carta fisica'}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View className="py-8 items-center">
                        <Text className="text-gray-500">Nessuna carta salvata</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </TabsContent>
          </Tabs>

     
          
          
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Phone Verification Modal - Root Level for Mobile (già presente) */}
      <Modal
        visible={showPhoneVerification}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPhoneVerification(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowPhoneVerification(false)}>
              <Text className="text-blue-500 text-sm">Annulla</Text>
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <Shield className="h-5 w-5" />
              <Text className="text-lg font-semibold">
                Verifica numero di telefono
              </Text>
            </View>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView className={`flex-1 p-4 ${Platform.OS === "ios" ? "pb-32" : ""}`}>
            <PhoneVerification
              os={Platform.OS}
              isOpen={showPhoneVerification}
              onClose={() => setShowPhoneVerification(false)}
              onVerified={async (verifiedPhone) => {
                // Verifica che la sessione sia valida
                if (!session?.user?.id) {
                  console.error("❌ No valid session found");
                  if (Platform.OS === "web") {
                    alert("Errore: sessione non valida. Effettua nuovamente il login.");
                  } else {
                    Alert.alert("Errore", "Sessione non valida. Effettua nuovamente il login.");
                  }
                  return;
                }
                
                try {
                  
                  // Prima facciamo una query di test per verificare che possiamo accedere al database
                  const { data: testData, error: testError } = await supabaseClient
                    .from("users")
                    .select("id, phone, phone_verified")
                    .eq("id", session.user.id)
                    .single();
                    
                  if (testError) {
                    console.error("❌ Test query failed:", testError);
                    throw new Error(`Database access test failed: ${testError.message}`);
                  }
                  
                  // Update the user's phone verification status in the database
                  const { data, error } = await supabaseClient
                    .from("users")
                    .update({
                      phone: verifiedPhone,
                      phone_verified: true,
                    })
                    .eq("id", session?.user.id)
                    .select(); // Aggiungiamo select() per vedere i dati aggiornati

                  if (error) {
                    console.error("❌ Database update error:", error);
                    
                    // Prova con supabaseAdmin come fallback
                    const adminClient = supabaseAdmin();
                    if (!adminClient) {
                      throw new Error('Failed to initialize Supabase admin client');
                    }
                    
                    const { data: adminData, error: adminError } = await adminClient
                      .from("users")
                      .update({
                        phone: verifiedPhone,
                        phone_verified: true,
                      })
                      .eq("id", session?.user.id)
                      .select();
                      
                    if (adminError) {
                      printLog(`❌ Admin fallback also failed: ${adminError}`, true);
                      throw adminError;
                    }
                    
                    printLog(`✅ Database updated successfully with admin client: ${adminData}`);
                } else {
                  printLog(`✅ Database updated successfully: ${data}`);
                }

                // Update local state - the useUserProfile hook will handle this automatically
                setFormData((prev) => ({ ...prev, phone: verifiedPhone }));
                  setPhoneChanged(false);
                  if (Platform.OS === "web") {
                    alert("Numero di telefono verificato con successo!");
                  } else {
                    Alert.alert(
                      "Successo",
                      "Numero di telefono verificato con successo!"
                    );
                  }
                } catch (error) {
                  printLog(`❌ Error updating phone verification: ${error}`, true);
                  if (Platform.OS === "web") {
                    alert("Errore nell'aggiornamento del profilo");
                  } else {
                    Alert.alert(
                      "Errore",
                      "Errore nell'aggiornamento del profilo"
                    );
                  }
                }
              }}
              initialPhone={formData.phone || profile?.phone || ""}
            />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
