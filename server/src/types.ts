export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: number;
  categoryId: string;
  name: string;
  description: string;
  /** Например «250 г» или «1 шт» */
  unit: string;
  price: number;
  /** Эмодзи и цвет плитки вместо фотографий в демо */
  emoji: string;
  color: string;
  inStock: boolean;
};

export type DeliveryMethod = 'pickup' | 'courier';

export type OrderStatus = 'new' | 'accepted' | 'ready' | 'done' | 'cancelled';

export type OrderItem = {
  productId: number;
  name: string;
  unit: string;
  price: number;
  qty: number;
};

export type Order = {
  id: number;
  userId: number;
  customerName: string;
  phone: string;
  delivery: DeliveryMethod;
  address: string;
  comment: string;
  items: OrderItem[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
};

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};
