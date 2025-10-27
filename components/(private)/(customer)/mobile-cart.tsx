import { useAuth } from "@/contexts/auth-context";
import { useCartContext } from "@/contexts/cart-context";
import { useImmediatePurchaseEmail } from "@/hooks/useImmediatePurchaseEmail";
import { createClientSupabase } from "@/lib/supabase";
import { printLog } from "@/lib/utils";
import { UserProps } from "@/types/types";
import { config } from "@/utils/config";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Animated, Dimensions, Platform, ScrollView, Text, View } from "react-native";
import CustomBottomSheet from "../../ui/bottom-sheet";
import Button from "../../ui/button";
import CartItemControls from "../../ui/cart-item-controls";
import CheckoutOptions, { CheckoutData } from "../../ui/checkout-options";


// Conditional import for Stripe - only on mobile
let useStripe: any = null;
if (Platform.OS !== 'web') {
  const stripeModule = require('@stripe/stripe-react-native');
  useStripe = stripeModule.useStripe;
}

export default function MobileCart({
  isOpen,
  closeDialog,
}: {
  isOpen: boolean;
  closeDialog: () => void;
}) {
  const { session } = useAuth();
  const stripe = useStripe ? useStripe() : null;
  const { items, totalPrice, removeItem, updateQuantity, clearCart } =
    useCartContext();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["30%", "64%"], []);
  // Usa una singola istanza del client
  const supabaseClient = useMemo(() => createClientSupabase(), []);

  // Hook per l'invio immediato delle email di acquisto
  const { sendImmediatePurchaseEmail } = useImmediatePurchaseEmail({
    userId: session?.user?.id
  });
  
  // Calculate total items from cart
  const totalItems = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  // Animation and screen management
  const [currentScreen, setCurrentScreen] = useState<"cart" | "checkout">(
    "cart"
  );
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get("window").width;

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return;
      
              try {
          setIsLoadingProfile(true);
          const { data, error } = await supabaseClient
          .from("users")
          .select("id, name, email, phone, phone_verified, address, stripe_customer_id")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
        } else {
          setUserProfile(data as UserProps);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [session]);

  // backdrop component
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

  // effects
  useEffect(() => {
    if (isOpen) {
      bottomSheetModalRef.current?.present();
      setCurrentScreen("cart"); // Reset to cart screen when opening
      slideAnim.setValue(0); // Reset animation
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [isOpen]);

  // callbacks
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        closeDialog();
        setCurrentScreen("cart"); // Reset screen when closing
        slideAnim.setValue(0); // Reset animation
      }
    },
    [closeDialog]
  );

  const handleProceedToCheckout = () => {
    // Check validation before proceeding
    const hasPhoneVerified = userProfile?.phone_verified || false;
    const hasAddress = userProfile?.address && userProfile.address.trim() !== "";

    if (!hasPhoneVerified) {
      Alert.alert(
        "Numero di telefono richiesto",
        "Devi verificare il tuo numero di telefono prima di procedere con l'ordine.",
        [
          { text: "Annulla", style: "cancel" },
          { 
            text: "Vai al profilo", 
            onPress: () => {
              closeDialog();
              // Preserve cart data by encoding it back to URL
              const orderData = {
                items: items.map((item) => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  customizations: item.customizations || [],
                })),
                totalPrice,
                totalItems,
              };
              const encodedOrderData = encodeURIComponent(JSON.stringify(orderData));
              router.push(`/profile?returnTo=checkout&orderData=${encodedOrderData}`);
            }
          }
        ]
      );
      return;
    }

    setCurrentScreen("checkout");
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleBackToCart = () => {
    setCurrentScreen("cart");
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleEmptyCart = () => {
    clearCart();
  };

  // Helper function to convert time slot to ISO string
  const convertTimeSlotToISO = (timeSlot: string): string => {
    const today = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    
    today.setHours(hours, minutes, 0, 0);
    return today.toISOString();
  };

  const handleCheckoutProceed = async (checkoutData: CheckoutData) => {
    // Use local IP for mobile device access
    const baseUrl = 'http://172.20.10.5:8081';
    printLog(`🔍 Using baseUrl: ${baseUrl}`, true);
    
    // Additional validation for delivery
    if (checkoutData.deliveryType === "delivery") {
      const hasAddress = userProfile?.address && userProfile.address.trim() !== "";
      
      if (!hasAddress) {
        Alert.alert(
          "Indirizzo richiesto",
          "Devi inserire un indirizzo di consegna per la consegna a domicilio.",
          [
            { text: "Annulla", style: "cancel" },
            { 
              text: "Vai al profilo", 
              onPress: () => {
                closeDialog();
                // Preserve cart data by encoding it back to URL
                const orderData = {
                  items: items.map((item) => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    customizations: item.customizations || [],
                  })),
                  totalPrice,
                  totalItems,
                };
                const encodedOrderData = encodeURIComponent(JSON.stringify(orderData));
                router.push(`/profile?returnTo=checkout&orderData=${encodedOrderData}`);
              }
            }
          ]
        );
        return;
      }
    }

    // Handle order processing based on payment method
    if (checkoutData.paymentMethod === "online") {
      // Use Stripe Payment Sheet for mobile
      if (Platform.OS === 'web') {
        Alert.alert(
          "Pagamento online",
          "Il pagamento online è disponibile solo su dispositivi mobili.",
          [{ text: "OK" }]
        );
        return;
      }

      if (!stripe) {
        Alert.alert(
          "Errore",
          "Stripe non è disponibile su questo dispositivo.",
          [{ text: "OK" }]
        );
        return;
      }

      try {
        // Calculate final total including delivery fee (same as web checkout)
        const deliveryFee = 3;
        const finalTotal = totalPrice + (checkoutData.deliveryType === "delivery" ? deliveryFee : 0);
        
        // Debug: Log the request details
        printLog(`🔍 Debugging API call:`, true);
        printLog(`- Base URL: ${baseUrl}`, true);
        printLog(`- Full URL: ${baseUrl}/api/stripe/payment-sheet`, true);
        printLog(`- Request method: POST`, true);
        
        // Create payment intent using payment-sheet API
        const response = await fetch(`${baseUrl}/api/stripe/payment-sheet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(finalTotal * 100), // Convert to cents, including delivery fee
            user_id: session?.user?.id,
            user_email: session?.user?.email,
            stripe_customer_id: userProfile?.stripe_customer_id, // Pass existing customer ID
            metadata: {
              user_id: session?.user?.id,
              user_email: session?.user?.email,
              is_delivery: checkoutData.deliveryType === "delivery",
              customer_time: checkoutData.timeOption === "scheduled" ? convertTimeSlotToISO(checkoutData.scheduledTime!) : new Date().toISOString(),
              is_custom_time: checkoutData.timeOption === "scheduled",
              payment_type: "online",
              items: JSON.stringify(items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                customizations: item.customizations || []
              })))
            },
            cartItems: items
          })
        });

        printLog(`🟡 Payment Sheet API Response status: ${response.status}`)
        printLog(`🟡 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
        printLog(`🟡 Response URL: ${response.url}`);

        if (!response.ok) {
          let errorData = {};
          try {
            const responseText = await response.text();
            printLog(`🟡 Raw response text: ${responseText}`);
            errorData = JSON.parse(responseText);
          } catch (parseError) {
            printLog(`❌ Failed to parse error response: ${parseError}`, true);
          }
          
          printLog(`❌ Payment Sheet API Error Response: ${JSON.stringify(errorData, null, 2)}`, true);
          printLog(`❌ Response status: ${response.status}`);
          printLog(`❌ Response statusText: ${response.statusText}`);
          Alert.alert(
            "Errore",
            `Impossibile creare la sessione di pagamento. Errore: ${(errorData as any).error || (errorData as any).details || 'Sconosciuto'}. Status: ${response.status}. Riprova più tardi.`
          );
          return;
        }

        const responseData = await response.json();
        printLog(`🟡 Payment Sheet API Response data: ${responseData}`)
        
        const { paymentIntent, ephemeralKey, customer, publishableKey } = responseData;
        
        if (!paymentIntent) {
          printLog(`❌ No payment intent in response: ${responseData}`, true);
          Alert.alert(
            "Errore",
            "Nessun intent di pagamento ricevuto. Riprova più tardi."
          );
          return;
        }
        
        printLog(`🟡 Initializing Stripe Payment Sheet...`)
        
        // Initialize the payment sheet first
        printLog(`🟡 Payment Sheet config:`, true);
        printLog(`- paymentIntentClientSecret: ${paymentIntent}`, true);
        printLog(`- merchantDisplayName: Pizzaurum`, true);
        printLog(`- publishableKey from API: ${publishableKey}`, true);
        printLog(`- publishableKey from config: ${config.stripe.publishableKey}`, true);
        printLog(`- NODE_ENV: ${process.env.NODE_ENV}`, true);
        
        const paymentSheetConfig = {
          paymentIntentClientSecret: paymentIntent,
          merchantDisplayName: 'Pizzaurum',
          defaultBillingDetails: {
            name: userProfile?.name || '',
            email: userProfile?.email || '',
          },
          allowsDelayedPaymentMethods: true,
          appearance: {
            colors: {
              primary: '#dc2626', // Rosso Pizzaurum
            },
          },
          returnURL: 'pizzaurum://payment-return',
        };
        
        printLog(`🟡 Payment Sheet config object: ${JSON.stringify(paymentSheetConfig, null, 2)}`, true);
        
        const { error: initError } = await stripe.initPaymentSheet(paymentSheetConfig as any);
        
        if (initError) {
          printLog(`❌ Payment Sheet init error: ${JSON.stringify(initError, null, 2)}`, true);
          Alert.alert(
            "Errore di inizializzazione",
            `Impossibile inizializzare il pagamento. Errore: ${initError.message || 'Sconosciuto'}`
          );
          return;
        }
        
        printLog(`🟡 Payment Sheet initialized successfully!`, true);
        
        printLog(`🟡 Presenting Stripe Payment Sheet...`)
        
        // Present the payment sheet
        printLog(`🟡 Presenting Payment Sheet...`, true);
        const { error } = await stripe.presentPaymentSheet();
        
        if (error) {
          printLog(`❌ Payment Sheet error: ${JSON.stringify(error, null, 2)}`);
          printLog(`❌ Error code: ${error.code}`);
          printLog(`❌ Error message: ${error.message}`, true);
          Alert.alert(
            "Errore di pagamento",
            `Errore: ${error.message || 'Sconosciuto'}`
          );
          return;
        }
        
        printLog(`🟡 Payment completed successfully!`)
        
        // Update local profile with stripe_customer_id if it was returned and we don't have it
        if (responseData.stripe_customer_id && !userProfile?.stripe_customer_id) {
          printLog(`🟡 Updating local profile with new stripe_customer_id: ${responseData.stripe_customer_id}`)
          setUserProfile((prev: any) => ({
            ...prev,
            stripe_customer_id: responseData.stripe_customer_id
          }));
        }
        
        // Clear cart and close dialog
        clearCart();
        closeDialog();
        
        // Show success message
        Alert.alert(
          "Pagamento completato!",
          "Il tuo ordine è stato confermato e verrà preparato al più presto.",
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate to orders page
                router.push("/orders");
              }
            }
          ]
        );
        
        return;
      } catch (error) {
        console.error("Error with Payment Sheet:", error);
        Alert.alert(
          "Errore",
          "Si è verificato un errore durante la creazione della sessione di pagamento. " + error
        );
        return;
      }
    } else {
      // Handle cash on delivery/pickup - create order in Supabase
      printLog(`🟡 Creating order for in-store payment (mobile)...`)
      
      try {
        // Calculate final total including delivery fee
        const deliveryFee = 3;
        const finalTotal = totalPrice + (checkoutData.deliveryType === "delivery" ? deliveryFee : 0);
        
        // Map payment method from UI to database format
        const mapPaymentMethod = (method: "online" | "on_delivery"): "cash" | "card" | "online" => {
          switch (method) {
            case "online":
              return "online";
            case "on_delivery":
              return "cash"; // Default to cash for on-delivery payments
            default:
              return "cash";
          }
        };

        // Map items to products format for database
        const products = items.map((item) => ({
          id: `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          product_id: item.id,
          extras: (item.customizations || []).map((custom: { name: string; price: number }) => ({
            name: custom.name,
            price: custom.price,
          })),
        }));

        // Helper function to convert custom time format to ISO timestamp
        const convertCustomTimeToISO = (checkoutData: CheckoutData): string | null => {
          if (checkoutData.timeOption === "asap") {
            return null;
          }
          
          if (checkoutData.timeOption === "scheduled" && checkoutData.scheduledTime) {
            // Handle "HH:MM" format by converting to today's date with that time
            const [hours, minutes] = checkoutData.scheduledTime.split(':').map(Number);
            const targetDate = new Date();
            targetDate.setHours(hours, minutes, 0, 0);
            return targetDate.toISOString();
          }
          
          // Fallback to current time
          return new Date().toISOString();
        };

        // Prepare complete order data
        const completeOrderData = {
          user_id: session?.user?.id,
          price: finalTotal,
          is_delivery: checkoutData.deliveryType === "delivery",
          payment: mapPaymentMethod(checkoutData.paymentMethod),
          status: "pending" as const,
          products: products,
          customer_time: convertCustomTimeToISO(checkoutData),
          online_payment: false, // For in-store payments, this is always false
          is_paid: false, // Will be updated after payment
          created_at: new Date().toISOString(),
          is_custom_time: checkoutData.timeOption === "scheduled", // Set to true if user chose scheduled time
          payment_issuer: mapPaymentMethod(checkoutData.paymentMethod) === "cash" ? "Contanti" : "Carta", // For in-store payments
        };

        // Insert order into Supabase
        const supabase = createClientSupabase();
        const { data: insertedOrder, error } = await supabase
          .from("orders")
          .insert([completeOrderData])
          .select()
          .single();

        if (error) {
          console.error("Supabase insert error (mobile):", error);
          Alert.alert(
            "Errore",
            `Errore durante la creazione dell'ordine: ${error.message}`
          );
          return;
        }

        printLog(`✅ Order successfully created in Supabase (mobile): ${insertedOrder}`)

        const insertedOrderId: string = insertedOrder.id as string;

        // Send immediate purchase confirmation email
        try {
          await sendImmediatePurchaseEmail(insertedOrderId);
        } catch (emailError) {
          printLog(`❌ Error sending immediate purchase confirmation email: ${emailError}`, true);
        }

        // Clear cart and close dialog
        clearCart();
        closeDialog();

        // Show success message and redirect
        Alert.alert(
          "Ordine confermato!",
          "Il tuo ordine è stato registrato. Pagherai al momento della consegna/ritiro.",
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate to orders page
                router.push("/orders");
              }
            }
          ]
        );
      } catch (error) {
        printLog(`❌ Error creating order (mobile): ${error}`, true)
        Alert.alert(
          "Errore",
          `Errore durante la creazione dell'ordine: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        );
      }
    }
  };

  return (
    <CustomBottomSheet
      bottomSheetRef={bottomSheetModalRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      renderBackdrop={renderBackdrop}
      index={2}
    >
      <View className="flex-1 overflow-hidden">
        <Animated.View
          className="flex-row w-full h-full"
          style={{
            transform: [{ translateX: slideAnim }],
            width: screenWidth * 2, // Double width to accommodate both screens
          }}
        >
          {/* Cart Screen */}
          <View className="flex-1 p-4" style={{ width: screenWidth }}>
            <Text className="text-xl font-bold mb-4">
              Carrello ({totalItems}{" "}
              {totalItems === 1 ? "articolo" : "articoli"})
            </Text>

            {items.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500 text-base mb-4">
                  Il carrello è vuoto
                </Text>
                <Text className="text-gray-400 text-sm text-center">
                  Aggiungi dei prodotti dal menu per iniziare
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  className=" mb-4"
                  showsVerticalScrollIndicator={false}
                >
                  {items.map((item) => (
                    <CartItemControls
                      key={item.uniqueId}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemoveItem={removeItem}
                    />
                  ))}
                </ScrollView>

                {/* Total Section */}
                <View className="border-t border-gray-200 pt-4 mb-4">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold">Totale:</Text>
                    <Text className="text-xl font-bold text-green-600">
                      €{totalPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex flex-row gap-3 mb-4">
                  <Button
                    text="Svuota carrello"
                    variant="destructive"
                    onPress={handleEmptyCart}
                    className="flex-1"
                  />
                  <Button
                    text="Procedi al checkout"
                    variant="primary"
                    onPress={handleProceedToCheckout}
                    className="flex-1"
                    disabled={isLoadingProfile}
                  />
                </View>
              </>
            )}
          </View>

          {/* Checkout Screen */}
          <View style={{ width: screenWidth }}>
            <CheckoutOptions
              totalPrice={totalPrice}
              onBack={handleBackToCart}
              onProceed={handleCheckoutProceed}
              userProfile={userProfile}
            />
          </View>
        </Animated.View>
      </View>
    </CustomBottomSheet>
  );
};
