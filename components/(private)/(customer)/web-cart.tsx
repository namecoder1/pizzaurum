import { useCartContext } from "@/contexts/cart-context";
import { router, usePathname } from "expo-router";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react-native";
import React from "react";
import Button from "../../ui/button";
import CartItemControls from "../../ui/cart-item-controls";

const WebCart = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (isOpen: boolean) => void }) => {
  const {
    items,
    totalItems,
    totalPrice,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCartContext();
  const pathname = usePathname();

  // Hide the cart on checkout page
  if (pathname === "/checkout") {
    return null;
  }

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleCheckout = () => {
    if (items.length === 0) return;

    // Create order metadata for URL (same logic as navbar.tsx)
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

    // Encode order data using encodeURIComponent to handle Unicode characters
    const encodedOrderData = encodeURIComponent(JSON.stringify(orderData));

    setIsOpen(false);
    router.push(`/checkout?orderData=${encodedOrderData}`);
  };

  const handleClearCart = () => {
    clearCart();
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop - only when open, optimized for touch events */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-60"
          style={{ touchAction: "manipulation" }}
          onClick={handleToggle}
        />
      )}

      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ margin: "12px" }}
      >
        {/* Expanded Cart Content - positioned absolute to stay at bottom */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white border border-gray-200 rounded-3xl shadow-lg max-h-[70vh] overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
          style={{
            zIndex: isOpen ? 60 : -1,
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Il tuo carrello</h3>
              <button
                onClick={handleToggle}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronDown size={20} />
              </button>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Il carrello è vuoto</p>
                <p className="text-gray-400 text-sm mt-1">
                  Aggiungi dei prodotti dal menu per iniziare
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <CartItemControls
                      key={item.uniqueId}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemoveItem={removeItem}
                      showImage={true}
                    />
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center font-semibold mb-3">
                    <span>Totale:</span>
                    <span className="text-lg text-green-600">
                      €{totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Button
                      text="Procedi al checkout"
                      className="w-full"
                      onPress={handleCheckout}
                    />
                    <Button
                      text="Svuota carrello"
                      variant="destructive"
                      className="w-full"
                      onPress={handleClearCart}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cart Footer - Always present but hidden when expanded */}
        <div
          className={`p-4 bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-sm flex items-center justify-between transition-all duration-300 ease-out ${
            isOpen ? "opacity-0" : "opacity-100"
          }`}
          style={{
            position: "relative",
            zIndex: isOpen ? -1 : 50,
          }}
        >
          <div className="flex flex-row items-center justify-start flex-1 gap-x-4">
            <ShoppingCart className="w-fit" size={24} />
            <div className="flex flex-col items-start justify-center">
              <p className="text-lg font-medium flex flex-col items-start justify-center leading-none">
                <span className="text-gray-500 text-sm">Totale:</span>
                <span className="text-lg font-bold">{totalPrice.toFixed(2)}€</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ChevronUp size={24} />
          </button>
        </div>
      </div>
    </>
  );
};

export default WebCart;
