"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  getScopedStorageItem,
  setScopedStorageItem,
} from "@/lib/store-browser-storage";
import { roundCurrency } from "@/lib/currency";
import {
  resolveLabelNormalPrice,
  resolveStorePricingPolicy,
} from "@/lib/pricing-policy";
import { getClientStoreId } from "@/lib/tenant/store-context";

type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  maxAvailable: number;
  slug?: string;
  imageUrl?: string | null;
  size?: string;
  color?: string;
};

type CartMutationResult = {
  ok: boolean;
  quantity: number;
  maxAvailable: number;
  reason?: string;
};

type CartContextType = {
  cart: CartItem[];
  isHydrated: boolean;
  addToCart: (item: CartItem, amount?: number) => CartMutationResult;
  updateQuantity: (variantId: string, quantity: number) => CartMutationResult;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[]) => void;
};

const CartContext = createContext<CartContextType | null>(null);

function normalizeCartPrice(price: number) {
  let storeId: number | null = null;

  try {
    storeId = getClientStoreId();
  } catch {
    storeId = null;
  }

  const pricingPolicy = resolveStorePricingPolicy({ storeId });
  return pricingPolicy.labelPriceRounding
    ? resolveLabelNormalPrice(price, pricingPolicy)
    : roundCurrency(price);
}

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = getScopedStorageItem("cart");
      setCart(
        stored
          ? (JSON.parse(stored) as CartItem[]).map((item) => ({
              ...item,
              price: normalizeCartPrice(item.price),
            }))
          : [],
      );
    } catch {
      setCart([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // guardar carrito
  useEffect(() => {
    if (!isHydrated) return;
    setScopedStorageItem("cart", JSON.stringify(cart));
  }, [cart, isHydrated]);

  const addToCart = (item: CartItem, amount = 1): CartMutationResult => {
    const existing = cart.find((i) => i.variantId === item.variantId);
    const currentQuantity = existing?.quantity ?? 0;
    const safeMax = Math.max(item.maxAvailable ?? existing?.maxAvailable ?? 0, 0);
    const requestedQuantity = currentQuantity + amount;

    if (safeMax <= 0) {
      return {
        ok: false,
        quantity: currentQuantity,
        maxAvailable: 0,
        reason: "No hay stock disponible para esta variante.",
      };
    }

    if (requestedQuantity > safeMax) {
      return {
        ok: false,
        quantity: currentQuantity,
        maxAvailable: safeMax,
        reason:
          safeMax === 1
            ? "Solo queda 1 unidad disponible."
            : `Solo hay ${safeMax} unidades disponibles para esta variante.`,
      };
    }

    setCart((prev) => {
      const existingItem = prev.find((i) => i.variantId === item.variantId);

      if (existingItem) {
        return prev.map((i) =>
          i.variantId === item.variantId
            ? {
                ...i,
                ...item,
                price: normalizeCartPrice(item.price),
                maxAvailable: safeMax,
                quantity: i.quantity + amount,
              }
            : i,
        );
      }

      return [...prev, { ...item, price: normalizeCartPrice(item.price) }];
    });

    return {
      ok: true,
      quantity: requestedQuantity,
      maxAvailable: safeMax,
    };
  };

  const updateQuantity = (variantId: string, quantity: number): CartMutationResult => {
    const existing = cart.find((item) => item.variantId === variantId);

    if (!existing) {
      return {
        ok: false,
        quantity: 0,
        maxAvailable: 0,
        reason: "No encontramos ese producto en el carrito.",
      };
    }

    const safeMax = Math.max(existing.maxAvailable ?? 0, 0);

    if (safeMax <= 0) {
      return {
        ok: false,
        quantity: existing.quantity,
        maxAvailable: safeMax,
        reason: "No hay stock disponible para esta variante.",
      };
    }

    if (quantity < 1) {
      setCart((prev) => prev.filter((item) => item.variantId !== variantId));
      return {
        ok: true,
        quantity: 0,
        maxAvailable: safeMax,
      };
    }

    if (quantity > safeMax) {
      return {
        ok: false,
        quantity: existing.quantity,
        maxAvailable: safeMax,
        reason:
          safeMax === 1
            ? "Solo queda 1 unidad disponible."
            : `Solo hay ${safeMax} unidades disponibles para esta variante.`,
      };
    }

    setCart((prev) =>
      prev.map((item) => (item.variantId === variantId ? { ...item, quantity } : item)),
    );

    return {
      ok: true,
      quantity,
      maxAvailable: safeMax,
    };
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => setCart([]);
  const replaceCart = (items: CartItem[]) =>
    setCart(items.map((item) => ({ ...item, price: normalizeCartPrice(item.price) })));

  return (
    <CartContext.Provider
      value={{ cart, isHydrated, addToCart, updateQuantity, removeFromCart, clearCart, replaceCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
