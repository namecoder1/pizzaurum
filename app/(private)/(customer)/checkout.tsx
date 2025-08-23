import PrivateLayout from "@/components/(private)/private-layout";
import Button from "@/components/ui/button";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/contexts/auth-context";
import { useCartContext } from "@/contexts/cart-context";
import { useImmediatePurchaseEmail } from "@/hooks/useImmediatePurchaseEmail";
import { createClientSupabase } from "@/lib/supabase";
import { printLog } from "@/lib/utils";
import { CartItem, UserProps } from "@/types/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type DeliveryType = "pickup" | "delivery";
type PaymentMethod = "online" | "in_store"; 
type TimePreference = "asap" | "scheduled";

// Interface for cart data passed to checkout
interface CartOrderData {
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
}

export default function Checkout() {
  const os = Platform.OS;
  const { session } = useAuth();
  const { items, totalPrice, clearCart } = useCartContext();
  const router = useRouter();
  const { orderData } = useLocalSearchParams();
  const [profile, setProfile] = useState<UserProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Order state
  const [orderDataState, setOrderDataState] = useState<CartOrderData | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const [timePreference, setTimePreference] = useState<TimePreference>("asap");
  const [scheduledTime, setScheduledTime] = useState<string>("");
    
  // Usa una singola istanza del client
  const supabaseClient = useMemo(() => createClientSupabase(), []);

  // Hook per l'invio immediato delle email di acquisto
  const { sendImmediatePurchaseEmail } = useImmediatePurchaseEmail({
    userId: session?.user?.id
  });

  const deliveryFee = 3;

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return;
      
      try {
        const { data, error } = await supabaseClient
          .from("users")
          .select("id, name, email, phone, phone_verified, address, stripe_customer_id")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
        } else {
          setProfile(data as UserProps);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [session]);

  useEffect(() => {
    if (orderData && typeof orderData === "string") {
      try {
        const decodedData = JSON.parse(decodeURIComponent(orderData));
        setOrderDataState(decodedData as CartOrderData);
      } catch (error) {
        console.error("Error decoding order data:", error);
        router.back();
      }
    }
  }, [orderData]);

  if (os !== "web") {
    router.back();
    return null;
  }

  if (!session) {
    return (
      <Loader size="fullscreen" text="Verifica autenticazione..." />
    );
  }

  if (loading) {
    return (
      <Loader size="fullscreen" text="Caricamento profilo..." />
    );
  }

  if (!orderDataState) {
    return (
      <Loader size="fullscreen" text="Caricamento dati ordine..." />
    );
  }

  // Validation checks
  const hasPhoneVerified = profile?.phone_verified || false;
  const hasAddress = profile?.address && profile.address.trim() !== "";
  const needsAddressForDelivery = deliveryType === "delivery" && !hasAddress;
  const needsPhoneVerified = !hasPhoneVerified;

  const validationErrors = [];
  if (needsPhoneVerified) {
    validationErrors.push("Numero di telefono non verificato");
  }
  if (needsAddressForDelivery) {
    validationErrors.push("Indirizzo di consegna mancante");
  }

  const hasValidationErrors = validationErrors.length > 0;

  const handleProfileRedirect = () => {
    // Preserve cart data by encoding it back to URL
    const currentOrderData = encodeURIComponent(JSON.stringify(orderDataState));
    router.push(`/profile?returnTo=checkout&orderData=${currentOrderData}`);
  };

  const calculateItemTotal = (item: CartItem) => {
    const basePrice = item.price;
    const customizationsPrice = (item.customizations || []).reduce(
      (sum: number, customization: { name: string; price: number }) => sum + customization.price,
      0
    );
    return (basePrice + customizationsPrice) * item.quantity;
  };

  const subtotal = orderDataState.items.reduce(
    (sum: number, item: CartItem) => sum + calculateItemTotal(item),
    0
  );
  const finalTotal = subtotal + (deliveryType === "delivery" ? deliveryFee : 0);

  const handleConfirmOrder = async () => {
    // Prevent order processing if there are validation errors
    if (hasValidationErrors) {
      return;
    }

    if (!session?.user?.id || !orderDataState) {
      console.error("Missing session or order data");
      return;
    }

    setIsLoading(true);

    try {
      // If online payment, create Stripe checkout session first
      if (paymentMethod === "online") {
        // Use absolute URL for API call
        const apiUrl = `${window.location.protocol}//${window.location.host}/api/stripe/create-checkout-session`;
        
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
                          body: JSON.stringify({
              items: orderDataState.items,
              totalPrice: finalTotal,
              user_id: session.user.id,
              user_email: session.user.email,
              stripe_customer_id: profile?.stripe_customer_id, // Passa il customer ID esistente a Stripe
              is_delivery: deliveryType === "delivery",
              customer_time: timePreference === "scheduled" ? scheduledTime : new Date().toISOString(),
              is_custom_time: timePreference === "scheduled"
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("API Error Response:", errorData);
            throw new Error(`Failed to create checkout session: ${response.status} ${response.statusText}`);
          }

          const responseData = await response.json();
          
          const { url } = responseData;
          
          if (!url) {
            console.error("No URL in response:", responseData);
            throw new Error('No checkout URL received from Stripe');
          }
          
          // Clear cart before redirecting
          clearCart();
          
          // Redirect to Stripe checkout
          window.location.href = url;
          return;
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);
          throw fetchError;
        }
      }
      
      // Map payment method from UI to database format
      const mapPaymentMethod = (
        method: PaymentMethod
      ): "cash" | "card" | "online" => {
        switch (method) {
          case "online":
            return "online";
          case "in_store":
            return "cash"; // Default to cash for in-store payments
          default:
            return "cash";
        }
      };

      // Map items to products format for database
      const products = orderDataState.items.map((item: CartItem) => ({
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
      const convertCustomTimeToISO = (customTime: string): string | null => {
        if (!customTime || timePreference === "asap") {
          return null;
        }
        
        // Handle "oggi-HH:MM" or "domani-HH:MM" format
        if (customTime.includes('-')) {
          const [day, time] = customTime.split('-');
          const [hours, minutes] = time.split(':').map(Number);
          
          const now = new Date();
          const targetDate = new Date();
          
          if (day === 'domani') {
            targetDate.setDate(now.getDate() + 1);
          }
          // else 'oggi' - use today
          
          targetDate.setHours(hours, minutes, 0, 0);
          return targetDate.toISOString();
        }
        
        // If it's already a valid ISO string, return as is
        if (customTime.includes('T') || customTime.includes('Z')) {
          return customTime;
        }
        
        // Fallback to current time
        return new Date().toISOString();
      };

      // Prepare complete order data
      const completeOrderData = {
        user_id: session.user.id,
        price: finalTotal,
        is_delivery: deliveryType === "delivery",
        payment: mapPaymentMethod(paymentMethod),
        status: "pending" as const,
        products: products,
        customer_time: convertCustomTimeToISO(scheduledTime),
        online_payment: false, // For in-store payments, this is always false
        is_paid: false, // Will be updated after payment if online
        created_at: new Date().toISOString(),
        is_custom_time: timePreference === "scheduled", // Set to true if user chose scheduled time
        payment_issuer: mapPaymentMethod(paymentMethod) === "cash" ? "Contanti" : "Carta", // For in-store payments
      };


      // Insert order into Supabase
      const supabase = createClientSupabase();
      const { data: insertedOrder, error } = await supabase
        .from("orders")
        .insert([completeOrderData])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      const insertedOrderId: string = insertedOrder.id as string;

      // Send immediate purchase confirmation email
      try {
        await sendImmediatePurchaseEmail(insertedOrderId);
      } catch (emailError) {
        printLog(`❌ Error sending immediate purchase confirmation email: ${emailError}`, true);
      }

      // Clear cart after successful order
      clearCart();

      // Redirect to orders page
      router.push("/orders");
      
    } catch (error) {
      console.error("❌ Error confirming order:", error);
      // Show error message to user
      alert(`Errore durante la creazione dell'ordine: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time slots for today and tomorrow (6 PM - 9:15 PM)
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Today's slots (only future times, between 18:00 and 21:15)
    for (let hour = 18; hour <= 21; hour++) {
      const minuteSlots = hour === 21 ? [0, 15] : [0, 30];
      for (let minutes of minuteSlots) {
        // Skip if past 21:15
        if (hour === 21 && minutes > 15) continue;

        // Skip if this time slot has already passed
        if (
          hour < currentHour ||
          (hour === currentHour && minutes <= currentMinutes)
        ) {
          continue;
        }

        slots.push({
          value: `oggi-${hour}:${minutes.toString().padStart(2, "0")}`,
          label: `Oggi ${hour}:${minutes.toString().padStart(2, "0")}`,
        });
      }
    }

    // Tomorrow's slots (18:00 - 21:15)
    for (let hour = 18; hour <= 21; hour++) {
      for (let minutes of [0, 30]) {
        // Skip if past 21:15
        if (hour === 21 && minutes > 15) continue;
        slots.push({
          value: `domani-${hour}:${minutes.toString().padStart(2, "0")}`,
          label: `Domani ${hour}:${minutes.toString().padStart(2, "0")}`,
        });
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <PrivateLayout title="Checkout | Pizzaurum" description="Checkout">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Checkout</h1>
          <p className="text-gray-600">
            Rivedi il tuo ordine e completa l'acquisto
          </p>
        </div>

        {/* Validation Banner */}
        {hasValidationErrors && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Informazioni mancanti per completare l'ordine
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleProfileRedirect}
                    className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    Completa il profilo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Riepilogo Ordine</h2>
              <div className="space-y-4">
                {orderDataState.items.map((item: CartItem, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-start border-b border-gray-100 pb-4"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      {(item.customizations || []).length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          {(item.customizations || []).map((c: { name: string; price: number }) => c.name).join(", ")}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Quantità: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        €{calculateItemTotal(item).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotale:</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                {deliveryType === "delivery" && (
                  <div className="flex justify-between text-primary">
                    <span>Supplemento consegna:</span>
                    <span>€{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2">
                  <span>Totale:</span>
                  <span>€{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Options */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Opzioni Consegna</h2>
              <div className="space-y-4">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    deliveryType === "pickup"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setDeliveryType("pickup")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Ritiro in sede</h3>
                      <p className="text-sm text-gray-600">
                        Ritira il tuo ordine presso il nostro locale
                      </p>
                    </div>
                    <div className="font-semibold text-green-600">Gratuito</div>
                  </div>
                </div>

                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    deliveryType === "delivery"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  } ${!hasAddress ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => hasAddress && setDeliveryType("delivery")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Consegna a domicilio</h3>
                      <p className="text-sm text-gray-600">
                        Ricevi il tuo ordine comodamente a casa
                      </p>
                      {!hasAddress && (
                        <p className="text-sm text-red-600 mt-1">
                          Indirizzo richiesto
                        </p>
                      )}
                    </div>
                    <div className="font-semibold text-primary">
                      +€{deliveryFee.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Preference */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Orario Preferito</h2>
              <div className="space-y-4">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    timePreference === "asap"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setTimePreference("asap")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Appena possibile</h3>
                      <p className="text-sm text-gray-600">
                        Il tuo ordine sarà preparato il prima possibile
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    timePreference === "scheduled"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setTimePreference("scheduled")}
                >
                  <div>
                    <h3 className="font-medium">Orario specifico</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Scegli quando vuoi ricevere il tuo ordine
                    </p>
                    {timePreference === "scheduled" && (
                      <select
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Seleziona orario</option>
                        {timeSlots.map((slot) => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Metodo di Pagamento</h2>
              <div className="space-y-4">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    paymentMethod === "online"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setPaymentMethod("online")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Pagamento online</h3>
                      <p className="text-sm text-gray-600">
                        Paga ora con carta di credito o PayPal
                      </p>
                    </div>
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Consigliato
                    </div>
                  </div>
                </div>

                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    paymentMethod === "in_store"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setPaymentMethod("in_store")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Pagamento in pizzeria</h3>
                      <p className="text-sm text-gray-600">
                        {deliveryType === "pickup"
                          ? "Paga al ritiro"
                          : "Paga alla consegna"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Conferma Ordine</h2>
              <p className="text-gray-600 mb-4">
                Clicca sul pulsante per confermare il tuo ordine di €
                {finalTotal.toFixed(2)}
              </p>
              <Button
                text={isLoading ? "Elaborazione..." : "Conferma Ordine"}
                className="w-full"
                onPress={handleConfirmOrder}
                disabled={
                  isLoading || 
                  hasValidationErrors ||
                  (timePreference === "scheduled" && !scheduledTime)
                }
              />
              {timePreference === "scheduled" && !scheduledTime && (
                <p className="text-sm text-red-500 mt-2">
                  Seleziona un orario per continuare
                </p>
              )}
              {hasValidationErrors && (
                <p className="text-sm text-red-500 mt-2">
                  Completa il profilo per continuare
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
};
