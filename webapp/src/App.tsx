import { useState } from 'react';

import { api, type Order } from './api';
import { useCart } from './cart';
import { CartView } from './components/CartView';
import { Catalog } from './components/Catalog';
import { AdminOrders, MyOrders } from './components/Orders';
import { ErrorMessage, Loader } from './components/ui';
import { insideTelegram, tg } from './telegram';
import { useRequest } from './useRequest';

type Tab = 'catalog' | 'cart' | 'orders' | 'admin';

export function App() {
  const me = useRequest(api.me, []);
  const catalog = useRequest(api.catalog, []);
  const cart = useCart(catalog.data?.products);
  const [tab, setTab] = useState<Tab>('catalog');
  const [justCreated, setJustCreated] = useState<Order | null>(null);

  if (me.loading || catalog.loading) return <Loader />;
  if (me.error || catalog.error || !me.data || !catalog.data) {
    return (
      <main className='app'>
        <ErrorMessage
          message={insideTelegram ? (me.error ?? catalog.error ?? 'Ошибка') : 'Откройте магазин через кнопку в Telegram-боте'}
          onRetry={() => {
            me.reload();
            catalog.reload();
          }}
        />
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'catalog', label: 'Каталог' },
    { id: 'cart', label: cart.count ? `Корзина · ${cart.count}` : 'Корзина' },
    { id: 'orders', label: 'Заказы' },
    ...(me.data.isAdmin ? [{ id: 'admin' as const, label: 'Админ' }] : [])
  ];

  const openTab = (id: Tab) => {
    tg.haptic.tap();
    if (id !== 'orders') setJustCreated(null);
    setTab(id);
  };

  return (
    <main className='app'>
      <p className='brand'>{me.data.shopName}</p>
      <nav className='tabs'>
        {tabs.map(({ id, label }) => (
          <button key={id} className={`tabs__item ${tab === id ? 'tabs__item_active' : ''}`} onClick={() => openTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'catalog' && <Catalog catalog={catalog.data} cart={cart} onOpenCart={() => openTab('cart')} />}
      {tab === 'cart' && (
        <CartView
          me={me.data}
          cart={cart}
          onBrowse={() => openTab('catalog')}
          onOrdered={(order) => {
            setJustCreated(order);
            setTab('orders');
          }}
        />
      )}
      {tab === 'orders' && <MyOrders justCreated={justCreated} />}
      {tab === 'admin' && <AdminOrders />}
    </main>
  );
}
