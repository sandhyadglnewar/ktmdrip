// ═══════════════════════════════════════════
// KTMDrip — Cart Context (Client-side state)
// Uses React Context + localStorage persistence
// Future: sync with KV for guest carts
// ═══════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { CartItem, Product } from "./types";

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  addItem: (product: Product) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  toggleCart: (open?: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ktmdrip-cart");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist cart to localStorage on change
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("ktmdrip-cart", JSON.stringify(items));
    }
  }, [items, hydrated]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + (item.sale_price || item.price) * item.quantity,
    0
  );

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          sale_price: product.sale_price,
          discount: product.discount,
          tag: product.tag,
          image_url: product.image_url,
          quantity: 1,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: number, delta: number) => {
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
      );
      return updated.filter((i) => i.quantity > 0);
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const toggleCart = useCallback((open?: boolean) => {
    setIsOpen((prev) => (open !== undefined ? open : !prev));
  }, []);

  return (
    <CartContext.Provider
      value={{ items, count, total, isOpen, addItem, removeItem, updateQuantity, clearCart, toggleCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
