import Button from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useCartContext } from "@/contexts/cart-context";
import { usePizzaCustomization } from "@/hooks/use-pizza-customization";
import { Minus } from "@/lib/icons/Minus";
import { Plus } from "@/lib/icons/Plus";
import { createClientSupabase } from "@/lib/supabase";
import { printLog } from "@/lib/utils";

import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Image as RNImage,
  Text,
  TouchableOpacity,
  View
} from "react-native";

interface ProductModalProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    type: "pizza" | "pizzaurum";
  };
  initialQuantity?: number;
}

const ProductModal = ({
  product,
  initialQuantity = 1,
}: ProductModalProps) => {
  const { session } = useAuth();
  const { addItem } = useCartContext();

  const {
    isOpen: dialogIsOpen,
    closeDialog,
    currentProductId,
    currentProductName,
    currentProductPrice,
    currentProductType,
    currentProductImage,
    quantity: customizationQuantity,
    customizations,
    totalPrice,
    setQuantity: setCustomizationQuantity,
    toggleBaseOption,
    toggleTopping,
    resetCustomizations,
    openDialog,
  } = usePizzaCustomization();

  // User profile state for verification
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [showPhoneVerificationAlert, setShowPhoneVerificationAlert] = useState(false);

  // Usa una singola istanza del client
  const supabaseClient = useMemo(() => createClientSupabase(), []);



  // Fetch user profile when modal opens
  useEffect(() => {
    if (dialogIsOpen) {
      fetchUserProfile();
    }
  }, [dialogIsOpen]);

  const fetchUserProfile = async () => {
    try {
      if (session?.user) {
        const { data: profileData } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
        }
      }
    } catch (error) {
      printLog(`❌ Error fetching user profile: ${error}`, true)
    }
  };

  const checkUserProfile = async () => {
    setIsCheckingProfile(true);

    try {
      if (!session?.user) {
        setShowPhoneVerificationAlert(true);
        return false;
      }

      if (!userProfile) {
        const { data: profileData } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
        } else {
          setShowPhoneVerificationAlert(true);
          return false;
        }
      }

      if (!userProfile?.phone_verified) {
        setShowPhoneVerificationAlert(true);
        return false;
      }

      return true;
    } catch (error) {
      printLog(`❌ Error checking user profile: ${error}`, true)
      setShowPhoneVerificationAlert(true);
      return false;
    } finally {
      setIsCheckingProfile(false);
    }
  };

  const incrementQuantity = () => {
    setCustomizationQuantity(customizationQuantity + 1);
  };

  const decrementQuantity = () => {
    if (customizationQuantity > 1) {
      setCustomizationQuantity(customizationQuantity - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!currentProductId || !currentProductName || !currentProductPrice) {
      return;
    }

    const profileComplete = await checkUserProfile();
    if (!profileComplete) return;

    // Create selected customizations array
    const selectedCustomizations: { name: string; price: number }[] = [];

    Object.entries(customizations.baseOptions).forEach(([key, option]) => {
      if (option.selected) {
        selectedCustomizations.push({
          name: option.name,
          price: option.price,
        });
      }
    });

    Object.entries(customizations.toppings).forEach(([key, option]) => {
      if (option.selected) {
        selectedCustomizations.push({
          name: option.name,
          price: option.price,
        });
      }
    });

    // Add to cart using context
    const cartItem = {
      id: currentProductId,
      name: currentProductName,
      price: currentProductPrice,
      quantity: customizationQuantity,
      image: currentProductImage,
      type: (currentProductType as "pizza" | "pizzaurum") || "pizza",
      customizations:
        selectedCustomizations.length > 0 ? selectedCustomizations : undefined,
      customizationTimestamp: Date.now(),
    };

    addItem(cartItem);

    // Reset alert when successfully adding to cart
    setShowPhoneVerificationAlert(false);

    closeDialog();
  };

  // Non renderizzare nulla se il dialog non è aperto o se mancano i dati necessari
  if (!dialogIsOpen || !currentProductId || !currentProductName) {
    return null;
  }

  // Mobile version
  return (
    <Modal
      visible={dialogIsOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeDialog}
    >

        <View className="flex-1 flex flex-col justify-between px-6 pb-8 pt-4">
          <View>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold">
                Personalizza il tuo prodotto 
              </Text>
              <TouchableOpacity onPress={closeDialog} className="p-2">
                <Text className="text-xl">×</Text>
              </TouchableOpacity>
            </View>

            {/* Phone verification alert */}
            {showPhoneVerificationAlert && (
              <View className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <View className="flex-row items-start">
                  <View className="flex-shrink-0 mt-1">
                    <Text className="text-red-400 text-lg">⚠️</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-medium text-red-800">
                      Verifica richiesta
                    </Text>
                    <Text className="mt-2 text-sm text-red-700">
                      Prima di aggiungere prodotti al carrello devi verificare il tuo numero di telefono.
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowPhoneVerificationAlert(false)}
                      className="mt-4 bg-red-100 px-4 py-2 rounded-md"
                    >
                      <Text className="text-red-800 text-sm font-medium">Chiudi</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Product info */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-4 flex-1">
                {currentProductImage && (
                  <RNImage
                    source={{ uri: currentProductImage }}
                    className="w-20 h-20 rounded-xl"
                  />
                )}
                <View className="flex-1">
                  <Text className="font-medium text-lg">
                    {currentProductName}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    €{currentProductPrice?.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Quantity controls */}
              <View className="flex-row items-center border border-gray-300 rounded-xl">
                <TouchableOpacity onPress={decrementQuantity} className="p-2">
                  <Minus size={16} />
                </TouchableOpacity>
                <Text className="px-2">{customizationQuantity}</Text>
                <TouchableOpacity onPress={incrementQuantity} className="p-2">
                  <Plus size={16} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Base options */}
            <View className="mb-6">
              <Text className="font-medium mb-3">Opzioni base</Text>
              <View className="flex flex-row gap-2">
                {Object.entries(customizations.baseOptions)
                  .slice(0, 2)
                  .map(([key, option]) => (
                    <MobileOption
                      key={key}
                      label={option.name}
                      price={option.price}
                      checked={option.selected}
                      onPress={() =>
                        toggleBaseOption(
                          key as keyof typeof customizations.baseOptions
                        )
                      }
                    />
                  ))}
              </View>
              <View className="flex flex-row gap-2 mt-2">
                {Object.entries(customizations.baseOptions)
                  .slice(2)
                  .map(([key, option]) => (
                    <MobileOption
                      key={key}
                      label={option.name}
                      price={option.price}
                      checked={option.selected}
                      onPress={() =>
                        toggleBaseOption(
                          key as keyof typeof customizations.baseOptions
                        )
                      }
                    />
                  ))}
              </View>
            </View>

            {/* Toppings */}
            <View className="mb-6">
              <Text className="font-medium mb-3">Ingredienti extra</Text>
              <View className="flex flex-row gap-2 mb-2">
                {Object.entries(customizations.toppings).slice(0, 2).map(
                  ([key, option]) => (
                    <MobileOption
                      key={key}
                      label={option.name}
                      price={option.price}
                      checked={option.selected}
                      onPress={() =>
                        toggleTopping(
                          key as keyof typeof customizations.toppings
                        )
                      }
                    />
                  )
                )}
              </View>
              <View className="flex flex-row gap-2 mb-2">
                {Object.entries(customizations.toppings).slice(2, 4).map(
                  ([key, option]) => (
                    <MobileOption
                      key={key}
                      label={option.name}
                      price={option.price}
                      checked={option.selected}
                      onPress={() =>
                        toggleTopping(
                          key as keyof typeof customizations.toppings
                        )
                      }
                    />
                  )
                )}
              </View>
              <View className="flex flex-row gap-2 mb-2">
                {Object.entries(customizations.toppings).slice(4, 6).map(
                  ([key, option]) => (
                    <MobileOption
                      key={key}
                      label={option.name}
                      price={option.price}
                      checked={option.selected}
                      onPress={() =>
                        toggleTopping(
                          key as keyof typeof customizations.toppings
                        )
                      }
                    />
                  )
                )}
              </View>
              <View className="flex flex-row gap-2 mb-2">
                {Object.entries(customizations.toppings).slice(6, 8).map(
                  ([key, option]) => (
                    <MobileOption
                      key={key}
                      label={option.name}
                      price={option.price}
                      checked={option.selected}
                      onPress={() =>
                        toggleTopping(
                          key as keyof typeof customizations.toppings
                        )
                      }
                    />
                  )
                )}
              </View>
              <View className="flex flex-row gap-2 mb-2">
                {Object.entries(customizations.toppings).slice(8, 10).map(
                  ([key, option]) => (
                    <MobileOption
                      key={key}
                      label={option.name}
                      price={option.price}
                      checked={option.selected}
                      onPress={() =>
                        toggleTopping(
                          key as keyof typeof customizations.toppings
                        )
                      }
                    />
                  )
                )}
              </View>
              <View className="flex flex-row gap-2 mb-2">
                {Object.entries(customizations.toppings).slice(10, 12).map(
                  ([key, option]) => (
                    <MobileOption
                      key={key}
                      label={option.name}
                      price={option.price}
                      checked={option.selected}
                      onPress={() =>
                        toggleTopping(
                          key as keyof typeof customizations.toppings
                        )
                      }
                    />
                  )
                )}
              </View>
            </View>
          </View>

          <View className="border-t border-gray-200 pt-4">
            {/* Total */}
            <View className="flex-row justify-between font-medium mb-6 rounded-lg">
              <Text className="font-bold">Totale</Text>
              <Text className="font-bold">€{totalPrice.toFixed(2)}</Text>
            </View>

            {/* Buttons */}
            <View className="gap-3 flex flex-row">
              <Button
                variant="destructive"
                text="Svuota"
                onPress={resetCustomizations}
                className="flex-1"
              />
              <Button
                variant="primary"
                text="Aggiungi al carrello"
                onPress={handleAddToCart}
                className="flex-1"
              />
            </View>
          </View>


        </View>
    </Modal>
  );
};



const MobileOption = ({
  label,
  price,
  checked,
  onPress,
}: {
  label: string;
  price: number;
  checked: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row flex-1 justify-between items-center p-3 rounded-xl border ${
        checked ? "bg-primary/10 border-primary" : "bg-white border-gray-300"
      }`}
    >
      <Text
        className={`font-medium text-sm ${checked ? "text-primary" : "text-gray-700"}`}
      >
        {label}
      </Text>
      <Text className={`text-sm ${checked ? "text-primary" : "text-gray-500"}`}>
        +€{price.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
};

export default ProductModal;
