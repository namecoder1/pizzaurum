import { UserProps } from "@/types/types";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import Button from "./button";

interface CheckoutOptionsProps {
  onBack: () => void;
  onProceed: (options: CheckoutData) => void;
  userProfile?: UserProps | null;
  totalPrice: number;
}

export interface CheckoutData {
  deliveryType: "delivery" | "pickup";
  timeOption: "asap" | "scheduled";
  scheduledTime?: string;
  paymentMethod: "online" | "on_delivery";
}

const CheckoutOptions: React.FC<CheckoutOptionsProps> = ({
  onBack,
  totalPrice,
  onProceed,
  userProfile,
}) => {
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery"
  );
  const [timeOption, setTimeOption] = useState<"asap" | "scheduled">("asap");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "on_delivery">(
    "online"
  );

  // Validation checks
  const hasPhoneVerified = userProfile?.phone_verified || false;
  const hasAddress = userProfile?.address && userProfile.address.trim() !== "";
  const needsAddressForDelivery = deliveryType === "delivery" && !hasAddress;

  const handleProceed = () => {
    // Check validation before proceeding
    if (!hasPhoneVerified) {
      Alert.alert(
        "Numero di telefono richiesto",
        "Devi verificare il tuo numero di telefono prima di procedere con l'ordine."
      );
      return;
    }

    if (needsAddressForDelivery) {
      Alert.alert(
        "Indirizzo richiesto",
        "Devi inserire un indirizzo di consegna per la consegna a domicilio."
      );
      return;
    }

    const data: CheckoutData = {
      deliveryType,
      timeOption,
      scheduledTime: timeOption === "scheduled" ? scheduledTime : undefined,
      paymentMethod,
    };
    onProceed(data);
  };

  const timeSlots = [
    "18:00",
    "18:15",
    "18:30",
    "18:45",
    "19:00",
    "19:15",
    "19:30",
    "19:45",
    "20:00",
    "20:15",
    "20:30",
    "20:45",
    "21:00",
    "21:15",
  ];

  return (
    <View className="flex-1 p-4">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={onBack} className="mr-4">
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold">Opzioni di consegna</Text>
      </View>

      {/* Validation Banner */}
      {(!hasPhoneVerified || needsAddressForDelivery) && (
        <View className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <Text className="text-sm font-medium text-red-800 mb-2">
            Informazioni mancanti:
          </Text>
          {!hasPhoneVerified && (
            <Text className="text-sm text-red-700 mb-1">
              • Numero di telefono non verificato
            </Text>
          )}
          {needsAddressForDelivery && (
            <Text className="text-sm text-red-700 mb-1">
              • Indirizzo di consegna mancante
            </Text>
          )}
        </View>
      )}

      {/* Delivery Type Selection */}
      <View className="mb-6">
        <Text className="text-base font-semibold mb-3">Tipo di servizio</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setDeliveryType("delivery")}
            className={`flex-1 p-3 rounded-xl border-2 ${
              deliveryType === "delivery"
                ? "border-primary bg-primary/10"
                : "border-gray-300"
            } ${!hasAddress ? "opacity-50" : ""}`}
            disabled={!hasAddress}
          >
            <Text
              className={`text-center font-medium ${
                deliveryType === "delivery" ? "text-primary" : "text-gray-700"
              }`}
            >
              Consegna a domicilio
            </Text>
            {!hasAddress && (
              <Text className="text-center text-xs text-red-600 mt-1">
                Indirizzo richiesto
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDeliveryType("pickup")}
            className={`flex-1 p-3 rounded-xl border-2 ${
              deliveryType === "pickup"
                ? "border-primary bg-primary/10"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-center font-medium ${
                deliveryType === "pickup" ? "text-primary" : "text-gray-700"
              }`}
            >
              Ritiro in negozio
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Selection */}
      <View className="mb-6">
        <Text className="text-base font-semibold mb-3">Orario</Text>
        <View className="gap-3">
          <TouchableOpacity
            onPress={() => setTimeOption("asap")}
            className={`p-3 rounded-xl border-2 ${
              timeOption === "asap"
                ? "border-primary bg-primary/10"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-center font-medium ${
                timeOption === "asap" ? "text-primary" : "text-gray-700"
              }`}
            >
              Prima possibile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTimeOption("scheduled")}
            className={`p-3 rounded-xl border-2 ${
              timeOption === "scheduled"
                ? "border-primary bg-primary/10"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-center font-medium ${
                timeOption === "scheduled" ? "text-primary" : "text-gray-700"
              }`}
            >
              Scegli un orario 
            </Text>
          </TouchableOpacity>

          {timeOption === "scheduled" && (
            <View className="mt-2">
              <Text className="text-sm font-medium mb-2">
                Seleziona orario:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => setScheduledTime(slot)}
                    className={`p-2 rounded-xl border-2 ${
                      scheduledTime === slot
                        ? "border-primary bg-primary/10"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        scheduledTime === slot
                          ? "text-primary"
                          : "text-gray-700"
                      }`}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Payment Method Selection */}
      <View className="mb-8">
        <Text className="text-base font-semibold mb-3">
          Modalità di pagamento
        </Text>
        <View className="gap-3">
          <TouchableOpacity
            onPress={() => setPaymentMethod("online")}
            className={`p-3 rounded-xl border-2 ${
              paymentMethod === "online"
                ? "border-primary bg-primary/10"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-center font-medium ${
                paymentMethod === "online" ? "text-primary" : "text-gray-700"
              }`}
            >
              Paga online
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaymentMethod("on_delivery")}
            className={`p-3 rounded-xl border-2 ${
              paymentMethod === "on_delivery"
                ? "border-primary bg-primary/10"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-center font-medium ${
                paymentMethod === "on_delivery"
                  ? "text-primary"
                  : "text-gray-700"
              }`}
            >
              {deliveryType === "delivery"
                ? "Paga alla consegna"
                : "Paga al ritiro"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex flex-col items-center justify-between mb-4">
        {deliveryType === "delivery" && (
          <View className="flex flex-row items-center justify-between w-full mb-2">
            <Text className="text-sm text-gray-500">
              Costo di consegna:
            </Text>
            <Text className="text-lg font-bold">
              €3.00
            </Text>
          </View>
        )}
        <View className="flex flex-row items-center justify-between w-full mb-2">
          <Text className="text-sm text-gray-500">
            Totale:
          </Text>
          <Text className="text-lg font-bold">
            {deliveryType === "delivery" ? `€${(totalPrice + 3).toFixed(2)}` : `€${totalPrice.toFixed(2)}`}
          </Text>
        </View>
      </View>

      {/* Proceed Button */}
      <View className="mt-auto mb-2">
        <Button
          text="Conferma ordine"
          variant="primary"
          onPress={handleProceed}
          className="w-full mb-4"
          disabled={!hasPhoneVerified || needsAddressForDelivery}
        />
        {(!hasPhoneVerified || needsAddressForDelivery) && (
          <Text className="text-sm text-red-500 text-center">
            Completa il profilo per continuare
          </Text>
        )}
      </View>
    </View>
  );
};

export default CheckoutOptions;
