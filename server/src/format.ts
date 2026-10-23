import { statusLabels } from './pricing.ts';
import type { Order, OrderStatus } from './types.ts';

const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit'
});

export const formatDateTime = (ms: number) => dateTimeFormat.format(ms);
export const formatPrice = (rub: number) => `${rub.toLocaleString('ru-RU')} ₽`;

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const statusEmoji: Record<OrderStatus, string> = {
  new: '🆕',
  accepted: '👨‍🍳',
  ready: '📦',
  done: '✅',
  cancelled: '❌'
};

export const statusLine = (status: OrderStatus) => `${statusEmoji[status]} ${statusLabels[status]}`;

/** Карточка заказа для сообщений в Telegram (HTML-разметка) */
export function orderCard(order: Order, { forAdmin = false } = {}): string {
  const lines = [
    `<b>Заказ №${order.id}</b> · ${formatDateTime(order.createdAt)}`,
    statusLine(order.status),
    '',
    ...order.items.map((i) => `• ${escapeHtml(i.name)} (${i.unit}) × ${i.qty} — ${formatPrice(i.price * i.qty)}`),
    ''
  ];
  if (order.deliveryFee > 0) lines.push(`Доставка: ${formatPrice(order.deliveryFee)}`);
  lines.push(`<b>Итого: ${formatPrice(order.total)}</b>`);
  lines.push(order.delivery === 'courier' ? `🚚 Доставка: ${escapeHtml(order.address)}` : '🏪 Самовывоз');
  if (forAdmin) lines.push(`🙋 ${escapeHtml(order.customerName)}, ${order.phone}`);
  if (order.comment) lines.push(`💬 ${escapeHtml(order.comment)}`);
  return lines.join('\n');
}
