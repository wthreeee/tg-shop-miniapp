import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { openDatabase, type Database } from './db.ts';
import { OrderError, createOrderService, type CreateOrderInput, type OrderService } from './order-service.ts';

// В демо-каталоге: 1 — Эфиопия 990 ₽, 2 — Колумбия 790 ₽, 5 — Гватемала (нет в наличии)
const ETHIOPIA = 1;
const COLOMBIA = 2;
const OUT_OF_STOCK = 5;
const CUSTOMER = 100;

let db: Database;
let service: OrderService;

const order = (overrides: Partial<CreateOrderInput> = {}) =>
  service.createOrder({
    userId: CUSTOMER,
    customerName: 'Иван',
    phone: '+7 912 345-67-89',
    delivery: 'pickup',
    address: '',
    comment: '',
    items: [{ productId: ETHIOPIA, qty: 2 }],
    ...overrides
  });

const expectError = (fn: () => unknown, code: OrderError['code']) =>
  assert.throws(fn, (error) => error instanceof OrderError && error.code === code);

beforeEach(() => {
  db = openDatabase(':memory:');
  service = createOrderService(db, () => Date.UTC(2026, 9, 23, 9));
});

describe('createOrder', () => {
  it('берёт цены из каталога и считает итог', () => {
    const created = order({ items: [{ productId: ETHIOPIA, qty: 2 }, { productId: COLOMBIA, qty: 1 }] });
    assert.equal(created.itemsTotal, 990 * 2 + 790);
    assert.equal(created.total, created.itemsTotal);
    assert.equal(created.phone, '+79123456789');
    assert.equal(created.status, 'new');
  });

  it('складывает одинаковые позиции', () => {
    const created = order({ items: [{ productId: ETHIOPIA, qty: 1 }, { productId: ETHIOPIA, qty: 2 }] });
    assert.equal(created.items.length, 1);
    assert.equal(created.items[0].qty, 3);
  });

  it('добавляет доставку и требует адрес для курьера', () => {
    expectError(() => order({ delivery: 'courier', address: '' }), 'invalid');
    const created = order({ delivery: 'courier', address: 'ул. Ленина, 1, кв. 5', items: [{ productId: COLOMBIA, qty: 1 }] });
    assert.equal(created.deliveryFee, 300);
    assert.equal(created.total, 790 + 300);
  });

  it('не продаёт товар, которого нет в наличии', () => {
    expectError(() => order({ items: [{ productId: OUT_OF_STOCK, qty: 1 }] }), 'unavailable');
  });

  it('проверяет телефон и пустую корзину', () => {
    expectError(() => order({ phone: '123' }), 'invalid');
    expectError(() => order({ items: [] }), 'invalid');
  });
});

describe('changeStatus', () => {
  it('проводит заказ по статусам и не даёт перескочить шаг', () => {
    const created = order();
    const admin = { userId: 1, isAdmin: true };
    expectError(() => service.changeStatus(created.id, 'done', admin), 'bad_status');
    service.changeStatus(created.id, 'accepted', admin);
    service.changeStatus(created.id, 'ready', admin);
    assert.equal(service.changeStatus(created.id, 'done', admin).status, 'done');
    expectError(() => service.changeStatus(created.id, 'cancelled', admin), 'bad_status');
  });

  it('разрешает покупателю отменить только новый заказ', () => {
    const first = order();
    assert.equal(service.changeStatus(first.id, 'cancelled', { userId: CUSTOMER, isAdmin: false }).status, 'cancelled');

    const second = order();
    service.changeStatus(second.id, 'accepted', { userId: 1, isAdmin: true });
    expectError(() => service.changeStatus(second.id, 'cancelled', { userId: CUSTOMER, isAdmin: false }), 'forbidden');
  });

  it('не даёт чужому пользователю менять заказ', () => {
    const created = order();
    expectError(() => service.changeStatus(created.id, 'cancelled', { userId: 999, isAdmin: false }), 'forbidden');
  });
});
