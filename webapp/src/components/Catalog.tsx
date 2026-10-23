import { useEffect, useState } from 'react';

import { formatPrice, type Catalog as CatalogData, type Product } from '../api';
import type { CartState } from '../cart';
import { tg } from '../telegram';

type Props = { catalog: CatalogData; cart: CartState; onOpenCart: () => void };

export function Catalog({ catalog, cart, onOpenCart }: Props) {
  const [category, setCategory] = useState(catalog.categories[0]?.id);
  const [opened, setOpened] = useState<Product | null>(null);
  const products = catalog.products.filter((p) => p.categoryId === category);

  return (
    <section className='catalog'>
      <nav className='chips' aria-label='Категории'>
        {catalog.categories.map((c) => (
          <button
            key={c.id}
            className={`chip ${c.id === category ? 'chip_active' : ''}`}
            onClick={() => {
              tg.haptic.tap();
              setCategory(c.id);
            }}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <ul className='grid'>
        {products.map((product) => (
          <li key={product.id}>
            <ProductTile product={product} qty={cart.cart[product.id] ?? 0} cart={cart} onOpen={() => setOpened(product)} />
          </li>
        ))}
      </ul>

      {cart.count > 0 && (
        <button className='cart-bar' onClick={onOpenCart}>
          <span>Корзина · {cart.count} шт.</span>
          <b>{formatPrice(cart.itemsTotal)}</b>
        </button>
      )}

      {opened && (
        <ProductSheet product={opened} qty={cart.cart[opened.id] ?? 0} cart={cart} onClose={() => setOpened(null)} />
      )}
    </section>
  );
}

function ProductTile({ product, qty, cart, onOpen }: { product: Product; qty: number; cart: CartState; onOpen: () => void }) {
  return (
    <article className={`tile ${product.inStock ? '' : 'tile_disabled'}`}>
      <button className='tile__image' style={{ background: product.color }} onClick={onOpen} aria-label={product.name}>
        <span>{product.emoji}</span>
        {qty > 0 && <span className='tile__badge'>{qty}</span>}
      </button>
      <button className='tile__info' onClick={onOpen}>
        <span className='tile__name'>{product.name}</span>
        <span className='tile__unit'>{product.unit}</span>
      </button>
      {product.inStock ? (
        qty > 0 ? (
          <Stepper qty={qty} onChange={(q) => cart.setQty(product.id, q)} />
        ) : (
          <button
            className='price-button'
            onClick={() => {
              tg.haptic.tap();
              cart.setQty(product.id, 1);
            }}
          >
            {formatPrice(product.price)}
          </button>
        )
      ) : (
        <span className='tile__out'>Нет в наличии</span>
      )}
    </article>
  );
}

export function Stepper({ qty, onChange }: { qty: number; onChange: (qty: number) => void }) {
  const change = (next: number) => {
    tg.haptic.tap();
    onChange(next);
  };
  return (
    <div className='stepper'>
      <button onClick={() => change(qty - 1)} aria-label='Убрать одну'>
        −
      </button>
      <span>{qty}</span>
      <button onClick={() => change(qty + 1)} aria-label='Добавить ещё' disabled={qty >= 20}>
        +
      </button>
    </div>
  );
}

function ProductSheet({ product, qty, cart, onClose }: { product: Product; qty: number; cart: CartState; onClose: () => void }) {
  useEffect(() => tg.showBackButton(onClose), [onClose]);

  return (
    <div className='sheet-backdrop' onClick={onClose}>
      <div className='sheet' role='dialog' aria-label={product.name} onClick={(e) => e.stopPropagation()}>
        <div className='sheet__image' style={{ background: product.color }}>
          {product.emoji}
        </div>
        <h2>{product.name}</h2>
        <p className='sheet__unit'>
          {product.unit} · {formatPrice(product.price)}
        </p>
        <p className='sheet__description'>{product.description}</p>
        {!product.inStock && <p className='notice'>Сейчас нет в наличии</p>}
        {product.inStock &&
          (qty > 0 ? (
            <div className='sheet__actions'>
              <Stepper qty={qty} onChange={(q) => cart.setQty(product.id, q)} />
              <button className='button button_primary' onClick={onClose}>
                Готово · {formatPrice(product.price * qty)}
              </button>
            </div>
          ) : (
            <button
              className='button button_primary'
              onClick={() => {
                tg.haptic.tap();
                cart.setQty(product.id, 1);
              }}
            >
              В корзину · {formatPrice(product.price)}
            </button>
          ))}
      </div>
    </div>
  );
}
