import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { COURIER_FEE, FREE_DELIVERY_FROM, normalizePhone, totals } from './pricing.ts';

describe('totals', () => {
  it('считает сумму товаров и бесплатный самовывоз', () => {
    assert.deepEqual(totals([{ price: 990, qty: 2 }, { price: 490, qty: 1 }], 'pickup'), {
      itemsTotal: 2470,
      deliveryFee: 0,
      total: 2470
    });
  });

  it('добавляет доставку для небольшого заказа', () => {
    assert.equal(totals([{ price: 790, qty: 1 }], 'courier').deliveryFee, COURIER_FEE);
  });

  it('делает доставку бесплатной от порога', () => {
    const result = totals([{ price: FREE_DELIVERY_FROM, qty: 1 }], 'courier');
    assert.equal(result.deliveryFee, 0);
    assert.equal(result.total, FREE_DELIVERY_FROM);
  });
});

describe('normalizePhone', () => {
  it('принимает разные форматы российского номера', () => {
    assert.equal(normalizePhone('+7 (912) 345-67-89'), '+79123456789');
    assert.equal(normalizePhone('89123456789'), '+79123456789');
    assert.equal(normalizePhone('9123456789'), '+79123456789');
  });

  it('отклоняет неполный или чужой номер', () => {
    assert.equal(normalizePhone('12345'), null);
    assert.equal(normalizePhone('+1 202 555 0123'), null);
  });
});
