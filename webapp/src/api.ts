import { tg } from './telegram';

export type Me = {
  id: number;
  name: string;
  isAdmin: boolean;
  shopName: string;
  courierFee: number;
  freeDeliveryFrom: number;
};
export type Category = { id: string; name: string };
export type Product = {
  id: number;
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  emoji: string;
  color: string;
  inStock: boolean;
};
export type Catalog = { categories: Category[]; products: Product[] };
export type OrderStatus = 'new' | 'accepted' | 'ready' | 'done' | 'cancelled';
export type DeliveryMethod = 'pickup' | 'courier';
export type Order = {
  id: number;
  customerName: string;
  phone: string;
  delivery: DeliveryMethod;
  address: string;
  comment: string;
  items: { productId: number; name: string; unit: string; price: number; qty: number }[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  statusLabel: string;
  createdLabel: string;
  nextStatuses: OrderStatus[];
};
export type CheckoutForm = { name: string; phone: string; delivery: DeliveryMethod; address: string; comment: string };

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (tg.initData) headers.set('Authorization', `tma ${tg.initData}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'Ошибка соединения с сервером');
  return data as T;
}

export const api = {
  me: () => request<Me>('/api/me'),
  catalog: () => request<Catalog>('/api/catalog'),
  createOrder: (form: CheckoutForm, items: { productId: number; qty: number }[]) =>
    request<Order>('/api/orders', { method: 'POST', body: JSON.stringify({ ...form, items }) }),
  myOrders: () => request<Order[]>('/api/orders/my'),
  setStatus: (id: number, status: OrderStatus) =>
    request<Order>(`/api/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  adminOrders: (filter: 'active' | 'all') => request<Order[]>(`/api/admin/orders?filter=${filter}`)
};

export const formatPrice = (rub: number) => `${rub.toLocaleString('ru-RU')} ₽`;
