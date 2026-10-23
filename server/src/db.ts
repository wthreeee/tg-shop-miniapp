import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { seedCategories, seedProducts } from './seed.ts';
import type { Category, Order, OrderItem, OrderStatus, Product } from './types.ts';

type Row = Record<string, unknown>;

export type Database = ReturnType<typeof openDatabase>;

export function openDatabase(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY,
      category_id TEXT    NOT NULL REFERENCES categories(id),
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      unit        TEXT    NOT NULL,
      price       INTEGER NOT NULL,
      emoji       TEXT    NOT NULL DEFAULT '',
      color       TEXT    NOT NULL DEFAULT '#eeeeee',
      in_stock    INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id            INTEGER PRIMARY KEY,
      user_id       INTEGER NOT NULL,
      customer_name TEXT    NOT NULL,
      phone         TEXT    NOT NULL,
      delivery      TEXT    NOT NULL,
      address       TEXT    NOT NULL DEFAULT '',
      comment       TEXT    NOT NULL DEFAULT '',
      items         TEXT    NOT NULL,
      items_total   INTEGER NOT NULL,
      delivery_fee  INTEGER NOT NULL,
      total         INTEGER NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'new',
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS orders_user ON orders (user_id, created_at);
    CREATE INDEX IF NOT EXISTS orders_status ON orders (status, created_at);
  `);

  seedIfEmpty(db);

  const toCategory = (r: Row): Category => ({ id: String(r.id), name: String(r.name) });

  const toProduct = (r: Row): Product => ({
    id: Number(r.id),
    categoryId: String(r.category_id),
    name: String(r.name),
    description: String(r.description),
    unit: String(r.unit),
    price: Number(r.price),
    emoji: String(r.emoji),
    color: String(r.color),
    inStock: Boolean(r.in_stock)
  });

  const toOrder = (r: Row): Order => ({
    id: Number(r.id),
    userId: Number(r.user_id),
    customerName: String(r.customer_name),
    phone: String(r.phone),
    delivery: r.delivery === 'courier' ? 'courier' : 'pickup',
    address: String(r.address),
    comment: String(r.comment),
    items: JSON.parse(String(r.items)) as OrderItem[],
    itemsTotal: Number(r.items_total),
    deliveryFee: Number(r.delivery_fee),
    total: Number(r.total),
    status: String(r.status) as OrderStatus,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at)
  });

  const all = (sql: string, ...params: (string | number)[]) => db.prepare(sql).all(...params) as Row[];
  const get = (sql: string, ...params: (string | number)[]) => db.prepare(sql).get(...params) as Row | undefined;

  return {
    listCategories: () => all('SELECT * FROM categories ORDER BY position').map(toCategory),

    listProducts: () => all('SELECT * FROM products ORDER BY id').map(toProduct),

    getProducts: (ids: number[]) =>
      ids.length === 0
        ? []
        : all(`SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids).map(toProduct),

    insertOrder: (o: Omit<Order, 'id' | 'status' | 'updatedAt'>) => {
      const result = db
        .prepare(
          `INSERT INTO orders
             (user_id, customer_name, phone, delivery, address, comment, items, items_total, delivery_fee, total, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          o.userId,
          o.customerName,
          o.phone,
          o.delivery,
          o.address,
          o.comment,
          JSON.stringify(o.items),
          o.itemsTotal,
          o.deliveryFee,
          o.total,
          o.createdAt,
          o.createdAt
        );
      return Number(result.lastInsertRowid);
    },

    getOrder: (id: number) => {
      const row = get('SELECT * FROM orders WHERE id = ?', id);
      return row ? toOrder(row) : undefined;
    },

    ordersForUser: (userId: number, limit = 20) =>
      all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', userId, limit).map(toOrder),

    /** Заказы для администратора: активные (не выполненные и не отменённые) или все за последние дни */
    ordersForAdmin: (filter: 'active' | 'all', limit = 50) =>
      (filter === 'active'
        ? all(`SELECT * FROM orders WHERE status IN ('new', 'accepted', 'ready') ORDER BY created_at DESC LIMIT ?`, limit)
        : all('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', limit)
      ).map(toOrder),

    setStatus: (id: number, status: OrderStatus, now: number) => {
      db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
    },

    close: () => db.close()
  };
}

function seedIfEmpty(db: DatabaseSync) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
  if (count > 0) return;

  const insertCategory = db.prepare('INSERT INTO categories (id, name, position) VALUES (?, ?, ?)');
  seedCategories.forEach((c, i) => insertCategory.run(c.id, c.name, i));

  const insertProduct = db.prepare(
    `INSERT INTO products (category_id, name, description, unit, price, emoji, color, in_stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const p of seedProducts) {
    insertProduct.run(p.categoryId, p.name, p.description, p.unit, p.price, p.emoji, p.color, Number(p.inStock));
  }
}
