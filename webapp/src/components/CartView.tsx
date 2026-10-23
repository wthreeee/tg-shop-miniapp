import { useState } from 'react';

import { api, formatPrice, type CheckoutForm, type Me, type Order } from '../api';
import type { CartState } from '../cart';
import { tg } from '../telegram';
import { Stepper } from './Catalog';
import { Empty, ErrorMessage, StepTitle } from './ui';

type Props = { me: Me; cart: CartState; onOrdered: (order: Order) => void; onBrowse: () => void };

export function CartView({ me, cart, onOrdered, onBrowse }: Props) {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');

  if (cart.lines.length === 0) {
    return (
      <section>
        <StepTitle>Корзина</StepTitle>
        <Empty>В корзине пока пусто</Empty>
        <button className='button button_primary' onClick={onBrowse}>
          Перейти в каталог
        </button>
      </section>
    );
  }

  return step === 'cart' ? (
    <section>
      <StepTitle>Корзина</StepTitle>
      <ul className='list'>
        {cart.lines.map(({ product, qty }) => (
          <li key={product.id} className='line'>
            <span className='line__image' style={{ background: product.color }}>
              {product.emoji}
            </span>
            <span className='line__info'>
              <span className='line__name'>{product.name}</span>
              <span className='line__meta'>
                {product.unit} · {formatPrice(product.price)}
              </span>
            </span>
            <span className='line__right'>
              <b>{formatPrice(product.price * qty)}</b>
              <Stepper qty={qty} onChange={(q) => cart.setQty(product.id, q)} />
            </span>
          </li>
        ))}
      </ul>
      <DeliveryHint me={me} itemsTotal={cart.itemsTotal} />
      <button className='button button_primary' onClick={() => setStep('checkout')}>
        Оформить · {formatPrice(cart.itemsTotal)}
      </button>
    </section>
  ) : (
    <Checkout me={me} cart={cart} onBack={() => setStep('cart')} onOrdered={onOrdered} />
  );
}

function DeliveryHint({ me, itemsTotal }: { me: Me; itemsTotal: number }) {
  const left = me.freeDeliveryFrom - itemsTotal;
  return (
    <p className='hint'>
      {left > 0
        ? `До бесплатной доставки осталось ${formatPrice(left)}`
        : 'Доставка курьером для этого заказа бесплатная 🎉'}
    </p>
  );
}

function Checkout({ me, cart, onBack, onOrdered }: { me: Me; cart: CartState; onBack: () => void; onOrdered: (o: Order) => void }) {
  const [form, setForm] = useState<CheckoutForm>({ name: me.name, phone: '', delivery: 'pickup', address: '', comment: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<CheckoutForm>) => setForm((f) => ({ ...f, ...patch }));
  const fee = form.delivery === 'courier' && cart.itemsTotal < me.freeDeliveryFrom ? me.courierFee : 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const order = await api.createOrder(
        form,
        cart.lines.map((l) => ({ productId: l.product.id, qty: l.qty }))
      );
      tg.haptic.success();
      cart.clear();
      onOrdered(order);
    } catch (e) {
      tg.haptic.error();
      setError(e instanceof Error ? e.message : 'Не удалось оформить заказ');
    } finally {
      setSending(false);
    }
  };

  return (
    <form className='checkout' onSubmit={submit}>
      <button type='button' className='back-link' onClick={onBack}>
        ← В корзину
      </button>
      <StepTitle>Оформление</StepTitle>

      <label className='field'>
        <span>Имя</span>
        <input id='name' value={form.name} onChange={(e) => update({ name: e.target.value })} autoComplete='name' required />
      </label>
      <label className='field'>
        <span>Телефон</span>
        <input
          id='phone'
          type='tel'
          inputMode='tel'
          placeholder='+7 900 000-00-00'
          value={form.phone}
          onChange={(e) => update({ phone: e.target.value })}
          autoComplete='tel'
          required
        />
      </label>

      <div className='field'>
        <span id='delivery-label'>Получение</span>
        <div className='segmented' role='radiogroup' aria-labelledby='delivery-label'>
          {(['pickup', 'courier'] as const).map((method) => (
            <label key={method} className={form.delivery === method ? 'segmented__item_active' : ''}>
              <input
                type='radio'
                name='delivery'
                value={method}
                checked={form.delivery === method}
                onChange={() => update({ delivery: method })}
              />
              {method === 'pickup' ? 'Самовывоз' : 'Курьером'}
            </label>
          ))}
        </div>
      </div>

      {form.delivery === 'courier' && (
        <label className='field'>
          <span>Адрес доставки</span>
          <input
            id='address'
            placeholder='Улица, дом, квартира'
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            autoComplete='street-address'
            required
          />
        </label>
      )}

      <label className='field'>
        <span>Комментарий (необязательно)</span>
        <textarea
          id='comment'
          rows={2}
          maxLength={300}
          placeholder='Например: помолоть под турку'
          value={form.comment}
          onChange={(e) => update({ comment: e.target.value })}
        />
      </label>

      <dl className='summary'>
        <dt>Товары</dt>
        <dd>{formatPrice(cart.itemsTotal)}</dd>
        <dt>Доставка</dt>
        <dd>{form.delivery === 'pickup' ? 'самовывоз' : fee ? formatPrice(fee) : 'бесплатно'}</dd>
        <dt>Итого</dt>
        <dd className='summary__total'>{formatPrice(cart.itemsTotal + fee)}</dd>
      </dl>

      {error && <ErrorMessage message={error} />}
      <button className='button button_primary' type='submit' disabled={sending}>
        {sending ? 'Отправляем…' : 'Подтвердить заказ'}
      </button>
      <p className='hint'>Оплата при получении. Мы напишем в Telegram, когда заказ будет готов.</p>
    </form>
  );
}
