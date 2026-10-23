import type { DeliveryMethod, OrderStatus } from './types.ts';

/** Стоимость курьерской доставки */
export const COURIER_FEE = 300;
/** Доставка бесплатная от этой суммы */
export const FREE_DELIVERY_FROM = 3000;
/** Защита от опечаток вроде «100 пачек» */
export const MAX_QTY_PER_ITEM = 20;

export function deliveryFee(itemsTotal: number, delivery: DeliveryMethod): number {
  if (delivery === 'pickup') return 0;
  return itemsTotal >= FREE_DELIVERY_FROM ? 0 : COURIER_FEE;
}

export function totals(lines: { price: number; qty: number }[], delivery: DeliveryMethod) {
  const itemsTotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const fee = deliveryFee(itemsTotal, delivery);
  return { itemsTotal, deliveryFee: fee, total: itemsTotal + fee };
}

/** Приводит телефон к виду +7XXXXXXXXXX. Возвращает null, если это не российский мобильный/городской номер */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return `+7${digits.slice(1)}`;
  if (digits.length === 10 && digits[0] === '9') return `+7${digits}`;
  return null;
}

/** Какие статусы можно выставить из текущего. Выполненный и отменённый заказ больше не меняются */
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  new: ['accepted', 'cancelled'],
  accepted: ['ready', 'cancelled'],
  ready: ['done', 'cancelled'],
  done: [],
  cancelled: []
};

export const statusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  accepted: 'Принят, собираем',
  ready: 'Готов к выдаче / передан курьеру',
  done: 'Выполнен',
  cancelled: 'Отменён'
};
