// config.ts импортируется первым: он выставляет часовой пояс до создания форматтеров дат
import { config } from './config.ts';

import { fileURLToPath } from 'node:url';

import { createApi } from './api.ts';
import { createBot } from './bot.ts';
import { openDatabase } from './db.ts';
import { createOrderService } from './order-service.ts';

const db = openDatabase(config.dbPath);
const orders = createOrderService(db);
const isAdmin = (userId: number) => config.adminIds.includes(userId);

const { bot, setup } = createBot({
  token: config.botToken,
  db,
  orders,
  adminIds: config.adminIds,
  webAppUrl: config.webAppUrl,
  shopName: config.shopName,
  proxyUrl: config.telegramProxy
});

const api = createApi({
  db,
  orders,
  botToken: config.botToken,
  isAdmin,
  shopName: config.shopName,
  devUserId: config.devUserId,
  webappDist: fileURLToPath(new URL('../../webapp/dist', import.meta.url))
});

await setup();
await api.listen({ port: config.port, host: '0.0.0.0' });

void bot.start({
  onStart: (info) => {
    console.log(`Бот @${info.username} запущен`);
    console.log(`API и Mini App: http://localhost:${config.port}`);
    if (!config.webAppUrl.startsWith('https://')) {
      console.log('⚠️  WEBAPP_URL не задан или не HTTPS — кнопка магазина в боте не появится');
    }
    if (config.adminIds.length === 0) {
      console.log('⚠️  ADMIN_IDS не задан — заказы никому не приходят. Узнать свой ID: /myid');
    }
  }
});

async function shutdown() {
  await bot.stop();
  await api.close();
  db.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
