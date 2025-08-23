import Button from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useCartContext } from "@/contexts/cart-context";
import { usePizzaCustomization } from "@/hooks/use-pizza-customization";
import { Minus } from "@/lib/icons/Minus";
import { Plus } from "@/lib/icons/Plus";
import { createClientSupabase } from "@/lib/supabase";
import React, { useEffect, useMemo, useState } from "react";

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
    closeDialog,
  } = usePizzaCustomization();

  // User profile state for verification
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [showPhoneVerificationAlert, setShowPhoneVerificationAlert] = useState(false);

  // Usa una singola istanza del client
  const supabaseClient = useMemo(() => createClientSupabase(), []);

  // Initialize hook state when component mounts
  useEffect(() => {
    openDialog(product, initialQuantity);
  }, [product.id, initialQuantity]);

  // Fetch user profile when component mounts
  useEffect(() => {
    fetchUserProfile();
  }, []);

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
      console.error("Error fetching user profile:", error);
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
      console.error("Error checking user profile:", error);
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

  if (!dialogIsOpen) {
    return null;
  }

  return (
    <Dialog open={dialogIsOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Personalizza il tuo prodotto</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
        {/* Product info */}
        <div className="flex justify-between items-center space-x-4">
          <div className="flex items-center gap-4">
            {currentProductImage && (
              <div className="relative w-20 h-20 rounded-md overflow-hidden">
                <img
                  src={currentProductImage}
                  alt={currentProductName || ""}
                  width={80}
                  height={80}
                  className="object-cover w-20 h-20"
                />
              </div>
            )}
            <div>
              <h3 className="font-medium text-lg">{currentProductName}</h3>
              <p className="text-sm">€{currentProductPrice?.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="flex items-center border rounded-xl">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                onPress={decrementQuantity}
                icon={<Minus className="h-3 w-3" />}
              />
              <span className="w-8 text-center">{customizationQuantity}</span>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onPress={incrementQuantity}
                icon={<Plus className="h-3 w-3" />}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Base options */}
        <div>
          <h4 className="font-medium mb-2">Opzioni base</h4>
          <div className="grid grid-cols-2 gap-2 items-center justify-center">
            {Object.entries(customizations.baseOptions).map(
              ([key, option]) => (
                <FakeBox
                  key={key}
                  label={option.name}
                  price={option.price}
                  checked={option.selected}
                  onClick={() =>
                    toggleBaseOption(
                      key as keyof typeof customizations.baseOptions
                    )
                  }
                />
              )
            )}
          </div>
        </div>

        <Separator />

        {/* Toppings */}
        <div>
          <h4 className="font-medium mb-2">Ingredienti extra</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(customizations.toppings).map(
              ([key, option]) => (
                <FakeBox
                  key={key}
                  label={option.name}
                  price={option.price}
                  checked={option.selected}
                  onClick={() =>
                    toggleTopping(
                      key as keyof typeof customizations.toppings
                    )
                  }
                />
              )
            )}
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between font-medium">
          <span>Totale</span>
          <span>€{totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {showPhoneVerificationAlert && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div>
                <div className="text-sm text-red-700">
                  <p>Prima di aggiungere prodotti al carrello devi verificare il tuo numero di telefono.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      <DialogFooter className="mt-6 flex flex-row space-x-2">
        <Button
          text="Reset"
          variant="outline"
          onPress={resetCustomizations}
          className="flex-1"
        />
        <Button
          text={isCheckingProfile ? "Verifica..." : "Aggiungi al carrello"}
          onPress={handleAddToCart}
          disabled={isCheckingProfile}
          className="flex-1"
        />
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

const FakeBox = ({
  label,
  price,
  checked,
  onClick,
}: {
  label: string;
  price: number;
  checked: boolean;
  onClick: () => void;
}) => {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 w-full">
        <p
          className={`py-2 w-full flex justify-between items-center text-center px-4 bg-card border border-input text-md rounded-3xl ${checked ? "bg-primary text-white" : ""}`}
        >
          <span className="font-semibold text-xs sm:text-sm">{label}</span>
          <span className="text-xs sm:text-sm">+€{price.toFixed(2)}</span>
        </p>
      </div>
      <Checkbox
        id="sort-by-date"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onCheckedChange={onClick}
        checked={checked}
      />
    </div>
  );
};



export default ProductModal;
