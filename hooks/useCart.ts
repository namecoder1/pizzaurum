import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  type?: "pizza" | "pizzaurum" | "drink" | "other";
  customizations?: { name: string; price: number }[];
  customizationTimestamp: number;
}

export interface CartItemWithProduct extends CartItem {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
  } | null;
  totalPrice: number;
}

const CART_STORAGE_KEY = 'pizzaurum_cart';

// Funzioni helper per il storage
const saveCartToStorage = async (cartItems: CartItem[]) => {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } else {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    }
  } catch (error) {
    console.error("Error saving cart to storage:", error);
  }
};

const loadCartFromStorage = async (): Promise<CartItem[]> => {
  try {
    let cartData: string | null = null;
    
    if (Platform.OS === "web" && typeof window !== "undefined") {
      cartData = localStorage.getItem(CART_STORAGE_KEY);
    } else {
      cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
    }
    
    if (cartData) {
      return JSON.parse(cartData);
    }
  } catch (error) {
    console.error("Error loading cart from storage:", error);
  }
  
  return [];
};

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carica il carrello dal storage all'inizializzazione
  useEffect(() => {
    const initializeCart = async () => {
      const savedCart = await loadCartFromStorage();
      setCartItems(savedCart);
      setIsInitialized(true);
    };

    initializeCart();
  }, []);

  // Salva il carrello nel storage quando cambia
  useEffect(() => {
    if (isInitialized) {
      saveCartToStorage(cartItems);
    }
  }, [cartItems, isInitialized]);

  // Function to add item to cart
  const addToCart = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      // Check if item with same customizations already exists
      const existingItemIndex = prev.findIndex(
        (cartItem) =>
          cartItem.id === item.id &&
          JSON.stringify(cartItem.customizations) ===
            JSON.stringify(item.customizations)
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item exists with same customizations
        const updated = [...prev];
        updated[existingItemIndex].quantity += item.quantity;
        return updated;
      } else {
        // Add new item
        return [...prev, item];
      }
    });
  }, []);

  // Function to remove item from cart
  const removeFromCart = useCallback(
    (id: string, customizationTimestamp: number) => {
      setCartItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.id === id &&
              item.customizationTimestamp === customizationTimestamp
            )
        )
      );
    },
    []
  );

  // Function to update item quantity
  const updateQuantity = useCallback(
    (id: string, customizationTimestamp: number, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(id, customizationTimestamp);
        return;
      }

      setCartItems((prev) =>
        prev.map((item) =>
          item.id === id &&
          item.customizationTimestamp === customizationTimestamp
            ? { ...item, quantity }
            : item
        )
      );
    },
    [removeFromCart]
  );

  // Function to clear cart
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Get total items count
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    isInitialized,
  };
};

// Hook to get cart items with product details
export const useCartWithProducts = (externalCartItems?: CartItem[]) => {
  const { cartItems: internalCartItems, ...cartMethods } = useCart();
  const cartItems = externalCartItems || internalCartItems;

  // Combine cart items with product details
  const cartItemsWithProducts: CartItemWithProduct[] = cartItems.map((item) => {
    // Calculate total price for this item
    const basePrice = item.price;
    const customizationPrice =
      item.customizations?.reduce(
        (sum, customization) => sum + customization.price,
        0
      ) || 0;
    const totalPrice = (basePrice + customizationPrice) * item.quantity;

    return {
      ...item,
      product: {
        id: item.id,
        name: item.name,
        description: "",
        price: item.price,
        image: item.image || "",
        category: item.type || "pizza",
      },
      totalPrice,
    };
  });

  // Calculate total cart price
  const totalPrice = cartItemsWithProducts.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  return {
    cartItems: cartItemsWithProducts,
    totalPrice,
    ...cartMethods,
  };
};
