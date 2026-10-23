# 🛍 Telegram Mini App Store

**English** · [Русский](README.ru.md)

An online store that opens right inside Telegram: a catalog with categories, a cart, and checkout with pickup or delivery. Each order instantly lands in the admin's chat with status buttons, and the customer is notified at every step.

The demo is a coffee roastery, but the catalog can be swapped for anything — flowers, bakery, cosmetics, clothing.

> The demo UI is in Russian; all texts are easy to translate.

**Inside Telegram:** the store opens from the bot, the order arrives to the admin with action buttons, the customer receives status updates.

<p>
  <img src="docs/screens/telegram-miniapp.png" width="240" alt="Mini App in Telegram">
  <img src="docs/screens/telegram-ordered.png" width="240" alt="Order placed">
  <img src="docs/screens/telegram-chat.png" width="280" alt="Order notifications in chat">
</p>

**Mini App screens:**

<p>
  <img src="docs/screens/1-catalog.png" width="200" alt="Catalog">
  <img src="docs/screens/2-product.png" width="200" alt="Product card">
  <img src="docs/screens/3-cart.png" width="200" alt="Cart">
</p>
<p>
  <img src="docs/screens/4-checkout.png" width="200" alt="Checkout">
  <img src="docs/screens/5-ordered.png" width="200" alt="Order placed">
  <img src="docs/screens/6-admin.png" width="200" alt="Admin orders">
</p>

## Features

**For customers**
- Catalog by category, product cards with descriptions, "out of stock" labels
- Cart with quantity steppers that persists between sessions
- "X left until free delivery" hint
- Checkout: name (prefilled from Telegram), phone, pickup or courier with address, comment
- "My orders" with statuses; cancel while the order hasn't been accepted yet
- Telegram notifications: accepted → ready → completed

**For the admin**
- New orders arrive in chat with "Accept", "Ready", "Handed over", "Cancel" buttons
- Admin tab in the Mini App: active and all orders, totals, customer phone
- `/orders` command — active orders right in the chat

**Reliability**
- Prices are recalculated on the server from the catalog — the client can't tamper with them
- Telegram `initData` signature check on every request
- Statuses only follow allowed transitions (you can't complete an order that wasn't accepted)
- Validation of phone, address and quantities
- 17 automated tests: totals and delivery, checkout, statuses, permissions, Telegram signature

## Tech stack

| | |
|---|---|
| Bot | Node.js 24, TypeScript, [grammY](https://grammy.dev) |
| API | Fastify (+ brotli/gzip compression) |
| Database | SQLite (built-in `node:sqlite`) |
| Mini App | React 19, TypeScript, Vite, Telegram Mini Apps SDK |
| Tests | `node:test` |

## Structure

```
server/src/
├── index.ts           # entry point: bot + API
├── bot.ts             # menu, notifications, admin status buttons
├── api.ts             # REST API for the Mini App
├── order-service.ts   # checkout and status changes
├── pricing.ts         # totals, delivery, phone, allowed status transitions
├── db.ts              # SQLite schema and queries
└── seed.ts            # demo catalog
webapp/src/
├── App.tsx            # tabs: catalog, cart, orders, admin
├── cart.ts            # persistent cart
└── components/        # catalog, cart & checkout, orders
```

## Quick start

Requires **Node.js 24+**.

**Try it without Telegram:**

```bash
npm install
npm run build
npm run preview
```

Open http://localhost:3000 — you are both the customer and the admin.

**Run with a bot:**

1. Create a bot with [@BotFather](https://t.me/BotFather), copy `.env.example` to `.env` and paste the token.
2. Start an HTTPS tunnel (`ssh -R 80:127.0.0.1:3000 nokey@localhost.run`) and put the address into `WEBAPP_URL`.
3. `npm run build && npm start`
4. Send `/myid` to the bot, put the ID into `ADMIN_IDS`, restart.

## Customizing for a client

- **Catalog** — `server/src/seed.ts` (categories, products, prices, stock)
- **Delivery** — `COURIER_FEE` and `FREE_DELIVERY_FROM` in `pricing.ts`
- **Store name** — `SHOP_NAME` in `.env`

**Possible extensions:** online payments (Telegram Payments / Stripe), product photos, promo codes, a catalog editor for the admin, order export to Google Sheets or a CRM.
