import { useEffect, useMemo, useState } from 'react';

import type { Product } from './api';

export type Cart = Record<number, number>;

const STORAGE_KEY = 'cart';
const MAX_QTY = 20;

function loadCart(): Cart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Cart) : {};
  } catch {
    return {};
  }
}

/** Корзина в состоянии React; сохраняется между открытиями Mini App на этом устройстве */
export function useCart(products: Product[] | undefined) {
  const [cart, setCart] = useState<Cart>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Хранилище недоступно — корзина просто не переживёт перезапуск
    }
  }, [cart]);

  const setQty = (productId: number, qty: number) =>
    setCart((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[productId];
      else next[productId] = Math.min(qty, MAX_QTY);
      return next;
    });

  // Строки корзины только по товарам, которые есть в каталоге и в наличии
  const lines = useMemo(
    () =>
      (products ?? [])
        .filter((p) => p.inStock && cart[p.id])
        .map((product) => ({ product, qty: cart[product.id] })),
    [products, cart]
  );

  const itemsTotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  return { cart, lines, itemsTotal, count, setQty, clear: () => setCart({}) };
}

export type CartState = ReturnType<typeof useCart>;
