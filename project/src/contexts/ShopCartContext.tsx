import { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

interface ShopCartContextType {
  items: CartItem[];
  subtotal: number;
  addItem: (productId: string, productName: string, unitPrice: number, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const ShopCartContext = createContext<ShopCartContextType | undefined>(undefined);

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (productId: string, productName: string, unitPrice: number, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: item.quantity + quantity,
                lineTotal: (item.quantity + quantity) * unitPrice,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId,
          productName,
          unitPrice,
          quantity,
          lineTotal: quantity * unitPrice,
        },
      ];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              lineTotal: quantity * item.unitPrice,
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

  return (
    <ShopCartContext.Provider
      value={{ items, subtotal, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </ShopCartContext.Provider>
  );
}

export function useShopCart() {
  const context = useContext(ShopCartContext);
  if (!context) {
    throw new Error('useShopCart must be used within ShopCartProvider');
  }
  return context;
}
