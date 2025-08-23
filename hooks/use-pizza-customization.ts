import { printLog } from "@/lib/utils";
import { create } from "zustand";

export type PizzaOption = {
  name: string;
  price: number;
  selected: boolean;
};

export type PizzaCustomization = {
  baseOptions: {
    bufala: PizzaOption;
    doppioImpasto: PizzaOption;
    spianataAlPiatto: PizzaOption;
    salumi: PizzaOption;
  };
  toppings: {
    friarielli: PizzaOption;
    gamberi: PizzaOption;
    mortadella: PizzaOption;
    mozzBufala: PizzaOption;
    pancetta: PizzaOption;
    porchetta: PizzaOption;
    prosciuttoCotto: PizzaOption;
    prosciuttoCrudo: PizzaOption;
    salame: PizzaOption;
    salsiccia: PizzaOption;
    speck: PizzaOption;
    wurstel: PizzaOption;
  };
};

export type CustomizationDialogState = {
  isOpen: boolean;
  currentProductId: string | null;
  currentProductName: string | null;
  currentProductPrice: number | null;
  currentProductType: string | null;
  currentProductImage: string | undefined;
  quantity: number;
  customizations: PizzaCustomization;
  totalPrice: number;
  isOpening: boolean; // Nuovo stato per prevenire aperture multiple

  openDialog: (
    product: {
      id: string;
      name: string;
      price: number;
      type: string;
      image?: string;
    },
    quantity: number
  ) => void;
  closeDialog: () => void;
  setQuantity: (quantity: number) => void;
  toggleBaseOption: (option: keyof PizzaCustomization["baseOptions"]) => void;
  toggleTopping: (option: keyof PizzaCustomization["toppings"]) => void;
  resetCustomizations: () => void;
};

const defaultCustomizations: PizzaCustomization = {
  baseOptions: {
    bufala: { name: "Bufala", price: 2, selected: false },
    doppioImpasto: { name: "Doppio impasto", price: 0.5, selected: false },
    spianataAlPiatto: { name: "Spianata al piatto", price: 1, selected: false },
    salumi: { name: "Salumi", price: 1, selected: false },
  },
  toppings: {
    friarielli: { name: "Friarielli", price: 1, selected: false },
    gamberi: { name: "Gamberi", price: 2, selected: false },
    mortadella: { name: "Mortadella", price: 1, selected: false },
    mozzBufala: { name: "Mozz. di bufala", price: 2, selected: false },
    pancetta: { name: "Pancetta", price: 1, selected: false },
    porchetta: { name: "Porchetta", price: 1, selected: false },
    prosciuttoCotto: { name: "Prosciutto cotto", price: 1, selected: false },
    prosciuttoCrudo: { name: "Prosciutto crudo", price: 2, selected: false },
    salame: { name: "Salame", price: 0.5, selected: false },
    salsiccia: { name: "Salsiccia", price: 1, selected: false },
    speck: { name: "Speck", price: 1, selected: false },
    wurstel: { name: "Wurstel", price: 0.5, selected: false },
  },
};

export const usePizzaCustomization = create<CustomizationDialogState>(
  (set, get) => ({
    isOpen: false,
    currentProductId: null,
    currentProductName: null,
    currentProductPrice: null,
    currentProductType: null,
    currentProductImage: undefined,
    quantity: 1,
    customizations: defaultCustomizations,
    totalPrice: 0,
    isOpening: false, // Nuovo stato per prevenire aperture multiple

    openDialog: (product, quantity) => {
      const state = get();
      
      // Preveni aperture multiple se il modal è già in apertura o aperto
      if (state.isOpening || state.isOpen) {
        printLog(`🟡 Dialog already open or opening, skipping...`);
        return;
      }

      printLog(`🟡 Opening dialog for product: ${product.name}`)
      
      set((state) => {
        // Reset customizations when opening the dialog
        const resetCustomizations = JSON.parse(
          JSON.stringify(defaultCustomizations)
        );

        return {
          isOpening: true, // Marca come in apertura
          isOpen: true,
          currentProductId: product.id,
          currentProductName: product.name,
          currentProductPrice: product.price,
          currentProductType: product.type,
          currentProductImage: product.image,
          quantity: quantity,
          customizations: resetCustomizations,
          totalPrice: product.price * quantity,
        };
      });

      // Reset isOpening dopo un delay più lungo per permettere al modal di renderizzarsi
      // e assicurarsi che altri bottomsheet siano completamente chiusi
      setTimeout(() => {
        set({ isOpening: false });
      }, 500); // Much longer delay to ensure all other bottomsheets are closed
    },

    closeDialog: () => {
      printLog(`🟡 Closing dialog`);
      set({ 
        isOpen: false, 
        isOpening: false,
        currentProductId: null,
        currentProductName: null,
        currentProductPrice: null,
        currentProductType: null,
        currentProductImage: undefined,
        quantity: 1,
        customizations: JSON.parse(JSON.stringify(defaultCustomizations)),
        totalPrice: 0
      });
    },

    setQuantity: (quantity) =>
      set((state) => {
        const basePrice = state.currentProductPrice || 0;
        const customizationsPrice = calculateCustomizationsPrice(
          state.customizations
        );
        return {
          quantity,
          totalPrice: (basePrice + customizationsPrice) * quantity,
        };
      }),

    toggleBaseOption: (option) =>
      set((state) => {
        const newCustomizations = { ...state.customizations };
        newCustomizations.baseOptions[option].selected =
          !newCustomizations.baseOptions[option].selected;

        const basePrice = state.currentProductPrice || 0;
        const customizationsPrice =
          calculateCustomizationsPrice(newCustomizations);

        return {
          customizations: newCustomizations,
          totalPrice: (basePrice + customizationsPrice) * state.quantity,
        };
      }),

    toggleTopping: (option) =>
      set((state) => {
        const newCustomizations = { ...state.customizations };
        newCustomizations.toppings[option].selected =
          !newCustomizations.toppings[option].selected;

        const basePrice = state.currentProductPrice || 0;
        const customizationsPrice =
          calculateCustomizationsPrice(newCustomizations);

        return {
          customizations: newCustomizations,
          totalPrice: (basePrice + customizationsPrice) * state.quantity,
        };
      }),

    resetCustomizations: () =>
      set((state) => {
        const resetCustomizations = JSON.parse(
          JSON.stringify(defaultCustomizations)
        );
        const basePrice = state.currentProductPrice || 0;

        return {
          customizations: resetCustomizations,
          totalPrice: basePrice * state.quantity,
        };
      }),
  })
);

// Helper function to calculate the price of all selected customizations
function calculateCustomizationsPrice(
  customizations: PizzaCustomization
): number {
  let total = 0;

  // Add base options prices
  Object.values(customizations.baseOptions).forEach((option) => {
    if (option.selected) {
      total += option.price;
    }
  });

  // Add toppings prices
  Object.values(customizations.toppings).forEach((topping) => {
    if (topping.selected) {
      total += topping.price;
    }
  });

  return total;
}
