// Режим предпросмотра: только API и Mini App (без Telegram-бота) на временной базе в памяти.
// Нужен, чтобы открыть магазин в обычном браузере без токена бота.
process.env.TZ = process.env.SHOP_TZ ?? 'Europe/Moscow';

const { fileURLToPath } = await import('node:url');
const { createApi } = await import('./api.ts');
const { createOrderService } = await import('./order-service.ts');
const { openDatabase } = await import('./db.ts');

const PREVIEW_USER_ID = 1;
const port = Number(process.env.PORT ?? 3000);
const db = openDatabase(':memory:');

const api = createApi({
  db,
  orders: createOrderService(db),
  botToken: 'preview',
  isAdmin: (userId) => userId === PREVIEW_USER_ID,
  shopName: 'Обжарочная «Зерно» (демо)',
  devUserId: PREVIEW_USER_ID,
  webappDist: fileURLToPath(new URL('../../webapp/dist', import.meta.url))
});

await api.listen({ port, host: '127.0.0.1' });
console.log(`Предпросмотр: http://localhost:${port} (данные хранятся в памяти и сбрасываются при перезапуске)`);
