import { useState } from 'react';

import { api, formatPrice, type Order, type OrderStatus } from '../api';
import { tg } from '../telegram';
import { useRequest } from '../useRequest';
import { Empty, ErrorMessage, Loader, StepTitle } from './ui';

const actionLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  accepted: 'Принять',
  ready: 'Готов',
  done: 'Выдан',
  cancelled: 'Отменить'
};

export function MyOrders({ justCreated }: { justCreated: Order | null }) {
  const { data, error, loading, reload } = useRequest(api.myOrders, []);

  return (
    <section>
      {justCreated && (
        <div className='done'>
          <div className='done__icon'>✓</div>
          <h1>Заказ №{justCreated.id} оформлен</h1>
          <p className='hint'>Подтверждение пришло в чат с ботом. Статус заказа будет обновляться здесь и в чате.</p>
        </div>
      )}
      <StepTitle>Мои заказы</StepTitle>
      {loading && <Loader />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty>Заказов пока нет</Empty>}
      <ul className='list'>
        {data?.map((order) => (
          <li key={order.id}>
            <OrderCard order={order} onChanged={reload} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AdminOrders() {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const { data, error, loading, reload } = useRequest(() => api.adminOrders(filter), [filter]);
  const revenue = data?.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0) ?? 0;

  return (
    <section>
      <StepTitle>Заказы</StepTitle>
      <div className='chips'>
        <button className={`chip ${filter === 'active' ? 'chip_active' : ''}`} onClick={() => setFilter('active')}>
          В работе
        </button>
        <button className={`chip ${filter === 'all' ? 'chip_active' : ''}`} onClick={() => setFilter('all')}>
          Все
        </button>
      </div>
      {loading && <Loader />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty>{filter === 'active' ? 'Активных заказов нет' : 'Заказов пока нет'}</Empty>}
      {data && data.length > 0 && (
        <p className='hint'>
          Заказов: {data.length} · на сумму {formatPrice(revenue)}
        </p>
      )}
      <ul className='list'>
        {data?.map((order) => (
          <li key={order.id}>
            <OrderCard order={order} onChanged={reload} forAdmin />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderCard({ order, onChanged, forAdmin = false }: { order: Order; onChanged: () => void; forAdmin?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = async (status: OrderStatus) => {
    if (status === 'cancelled' && !(await tg.confirm(`Отменить заказ №${order.id}?`))) return;
    setBusy(true);
    setError(null);
    try {
      await api.setStatus(order.id, status);
      tg.haptic.success();
      onChanged();
    } catch (e) {
      tg.haptic.error();
      setError(e instanceof Error ? e.message : 'Не удалось изменить статус');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className='order'>
      <header className='order__head'>
        <b>№{order.id}</b>
        <span className={`status status_${order.status}`}>{order.statusLabel}</span>
      </header>
      <p className='order__meta'>{order.createdLabel}</p>
      <ul className='order__items'>
        {order.items.map((item) => (
          <li key={item.productId}>
            <span>
              {item.name} × {item.qty}
            </span>
            <span>{formatPrice(item.price * item.qty)}</span>
          </li>
        ))}
        {order.deliveryFee > 0 && (
          <li>
            <span>Доставка</span>
            <span>{formatPrice(order.deliveryFee)}</span>
          </li>
        )}
      </ul>
      <p className='order__total'>
        <span>{order.delivery === 'courier' ? `🚚 ${order.address}` : '🏪 Самовывоз'}</span>
        <b>{formatPrice(order.total)}</b>
      </p>
      {forAdmin && (
        <p className='order__meta'>
          🙋 {order.customerName} · <a href={`tel:${order.phone}`}>{order.phone}</a>
        </p>
      )}
      {order.comment && <p className='order__meta'>💬 {order.comment}</p>}
      {error && <p className='order__error'>{error}</p>}
      {order.nextStatuses.length > 0 && (
        <div className='order__actions'>
          {order.nextStatuses.map((status) => (
            <button
              key={status}
              className={`button ${status === 'cancelled' ? 'button_danger' : 'button_secondary'}`}
              disabled={busy}
              onClick={() => setStatus(status)}
            >
              {forAdmin ? actionLabels[status] : 'Отменить заказ'}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
