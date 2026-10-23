import type { Database } from './db.ts';
import { MAX_QTY_PER_ITEM, nextStatuses, normalizePhone, totals } from './pricing.ts';
import type { DeliveryMethod, Order, OrderItem, OrderStatus } from './types.ts';

export type OrderErrorCode = 'invalid' | 'unavailable' | 'not_found' | 'forbidden' | 'bad_status';

export class OrderError extends Error {
  code: OrderErrorCode;

  constructor(code: OrderErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type OrderEvent =
  | { type: 'created'; order: Order }
  | { type: 'status'; order: Order; byCustomer: boolean };

export type CreateOrderInput = {
  userId: number;
  customerName: string;
  phone: string;
  delivery: DeliveryMethod;
  address: string;
  comment: string;
  items: { productId: number; qty: number }[];
};

export function createOrderService(db: Database, now: () => number = Date.now) {
  const listeners: ((event: OrderEvent) => void)[] = [];
  const emit = (event: OrderEvent) => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Ошибка обработчика события заказа:', error);
      }
    }
  };

  function createOrder(input: CreateOrderInput): Order {
    const customerName = input.customerName.trim().slice(0, 60);
    if (customerName.length < 2) throw new OrderError('invalid', 'Укажите имя');

    const phone = normalizePhone(input.phone);
    if (!phone) throw new OrderError('invalid', 'Укажите телефон в формате +7 900 000-00-00');

    const address = input.address.trim().slice(0, 200);
    if (input.delivery === 'courier' && address.length < 5) {
      throw new OrderError('invalid', 'Укажите адрес доставки');
    }

    // Одинаковые товары складываем, количество проверяем
    const qtyById = new Map<number, number>();
    for (const item of input.items) {
      if (!Number.isInteger(item.productId) || !Number.isInteger(item.qty) || item.qty < 1) {
        throw new OrderError('invalid', 'Некорректная корзина');
      }
      qtyById.set(item.productId, (qtyById.get(item.productId) ?? 0) + item.qty);
    }
    if (qtyById.size === 0) throw new OrderError('invalid', 'Корзина пуста');

    // Цены берём из базы, а не из запроса: клиент не может подменить стоимость
    const products = db.getProducts([...qtyById.keys()]);
    const items: OrderItem[] = [...qtyById.entries()].map(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      if (!product) throw new OrderError('unavailable', 'Один из товаров больше не продаётся. Обновите корзину');
      if (!product.inStock) throw new OrderError('unavailable', `«${product.name}» закончился. Уберите его из корзины`);
      if (qty > MAX_QTY_PER_ITEM) throw new OrderError('invalid', `Не больше ${MAX_QTY_PER_ITEM} шт. одного товара`);
      return { productId, name: product.name, unit: product.unit, price: product.price, qty };
    });

    const sums = totals(items, input.delivery);
    const id = db.insertOrder({
      userId: input.userId,
      customerName,
      phone,
      delivery: input.delivery,
      address: input.delivery === 'courier' ? address : '',
      comment: input.comment.trim().slice(0, 300),
      items,
      ...sums,
      createdAt: now()
    });

    const order = db.getOrder(id)!;
    emit({ type: 'created', order });
    return order;
  }

  function changeStatus(orderId: number, status: OrderStatus, actor: { userId: number; isAdmin: boolean }): Order {
    const order = db.getOrder(orderId);
    if (!order) throw new OrderError('not_found', 'Заказ не найден');

    const isCustomer = order.userId === actor.userId;
    // Покупатель может только отменить свой заказ, пока его не приняли
    const customerMayCancel = isCustomer && status === 'cancelled' && order.status === 'new';
    if (!actor.isAdmin && !customerMayCancel) {
      throw new OrderError('forbidden', isCustomer ? 'Заказ уже в работе — напишите нам, чтобы отменить' : 'Нет доступа');
    }
    if (!nextStatuses[order.status].includes(status)) {
      throw new OrderError('bad_status', 'Этот статус сейчас нельзя выставить');
    }

    db.setStatus(orderId, status, now());
    const updated = db.getOrder(orderId)!;
    emit({ type: 'status', order: updated, byCustomer: !actor.isAdmin });
    return updated;
  }

  return {
    createOrder,
    changeStatus,
    onEvent: (listener: (event: OrderEvent) => void) => listeners.push(listener)
  };
}

export type OrderService = ReturnType<typeof createOrderService>;
