import Loader from "@/components/ui/Loader";
import { CartContextType, CartItem } from "@/types/types";
import React, { createContext, ReactNode, useContext } from "react";
import { useCart, useCartWithProducts } from "../hooks/useCart";

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const cartMethods = useCart();

  // Passo i cartItems dal cartMethods per condividere lo stesso stato
  const cartWithProducts = useCartWithProducts(cartMethods.cartItems);

  // Mostra loader durante l'inizializzazione del carrello
  if (!cartMethods.isInitialized) {
    return <Loader size="fullscreen" text="Caricamento carrello..." />;
  }

  const value: CartContextType = {
    items: cartWithProducts.cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      type: item.type || "pizza",
      customizations: item.customizations,
      customizationTimestamp: item.customizationTimestamp,
      uniqueId: `${item.id}_${item.customizationTimestamp}`,
    })),
    addItem: (item: Omit<CartItem, "uniqueId">) => {
      const cartItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        type: item.type,
        customizations: item.customizations,
        customizationTimestamp: item.customizationTimestamp || Date.now(),
      };
      cartMethods.addToCart(cartItem);
    },
    removeItem: (uniqueId: string) => {
      const [id, timestamp] = uniqueId.split("_");
      cartMethods.removeFromCart(id, parseInt(timestamp));
    },
    updateQuantity: (uniqueId: string, quantity: number) => {
      const [id, timestamp] = uniqueId.split("_");
      cartMethods.updateQuantity(id, parseInt(timestamp), quantity);
    },
    setItemQuantity: (uniqueId: string, quantity: number) => {
      const [id, timestamp] = uniqueId.split("_");
      cartMethods.updateQuantity(id, parseInt(timestamp), quantity);
    },
    clearCart: cartMethods.clearCart,
    totalItems: cartMethods.totalItems,
    totalPrice: cartWithProducts.totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
};
