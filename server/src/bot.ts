import { Bot, GrammyError, InlineKeyboard, type Context } from 'grammy';
import { HttpsProxyAgent } from 'https-proxy-agent';

import type { Database } from './db.ts';
import { escapeHtml, orderCard, statusLine } from './format.ts';
import { nextStatuses } from './pricing.ts';
import { OrderError, type OrderEvent, type OrderService } from './order-service.ts';
import type { Order, OrderStatus } from './types.ts';

type BotOptions = {
  token: string;
  db: Database;
  orders: OrderService;
  adminIds: number[];
  webAppUrl: string;
  shopName: string;
  proxyUrl: string | null;
};

const actionLabels: Partial<Record<OrderStatus, string>> = {
  accepted: '✅ Принять',
  ready: '📦 Готов',
  done: '🏁 Выдан',
  cancelled: '❌ Отменить'
};

/** Сообщение покупателю при смене статуса */
const customerStatusText: Partial<Record<OrderStatus, string>> = {
  accepted: 'Мы приняли ваш заказ и уже собираем его.',
  ready: 'Заказ готов! Ждём вас или передали курьеру.',
  done: 'Заказ выполнен. Спасибо, что выбрали нас! ☕',
  cancelled: 'Заказ отменён. Если это ошибка — просто напишите нам.'
};

export function createBot(options: BotOptions) {
  const { db, orders, adminIds } = options;
  const bot = new Bot(options.token, {
    client: options.proxyUrl ? { baseFetchConfig: { agent: new HttpsProxyAgent(options.proxyUrl) } } : undefined
  });
  const hasWebApp = options.webAppUrl.startsWith('https://');
  const isAdmin = (ctx: Context) => Boolean(ctx.from && adminIds.includes(ctx.from.id));

  const mainMenu = () => {
    const keyboard = new InlineKeyboard();
    if (hasWebApp) keyboard.webApp('🛍 Открыть магазин', options.webAppUrl).row();
    return keyboard.text('📦 Мои заказы', 'my');
  };

  /** Кнопки смены статуса под заказом в чате администратора */
  const adminKeyboard = (order: Order) => {
    const keyboard = new InlineKeyboard();
    for (const status of nextStatuses[order.status]) {
      keyboard.text(actionLabels[status] ?? status, `st:${order.id}:${status}`);
    }
    return keyboard;
  };

  const send = (chatId: number, text: string, keyboard?: InlineKeyboard) =>
    bot.api.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard }).catch((error) => {
      console.warn(`Не удалось отправить сообщение в чат ${chatId}:`, error.message);
    });

  orders.onEvent((event: OrderEvent) => {
    const { order } = event;
    if (event.type === 'created') {
      void send(order.userId, `🧾 <b>Спасибо за заказ!</b>\n\n${orderCard(order)}\n\nСообщим, как только примем его в работу.`);
      for (const adminId of adminIds) {
        void send(adminId, `🛒 <b>Новый заказ</b>\n\n${orderCard(order, { forAdmin: true })}`, adminKeyboard(order));
      }
      return;
    }
    if (event.byCustomer) {
      for (const adminId of adminIds) {
        void send(adminId, `Покупатель отменил заказ:\n\n${orderCard(order, { forAdmin: true })}`);
      }
    } else {
      const text = customerStatusText[order.status];
      if (text) void send(order.userId, `<b>Заказ №${order.id}</b>: ${statusLine(order.status)}\n\n${text}`);
    }
  });

  bot.command('start', async (ctx) => {
    const name = escapeHtml(ctx.from?.first_name ?? '');
    const text = [
      `Здравствуйте, ${name}! 👋`,
      `Это магазин <b>${escapeHtml(options.shopName)}</b> в Telegram.`,
      '',
      hasWebApp
        ? 'Откройте каталог, соберите корзину и оформите заказ — с самовывозом или доставкой.'
        : '⚠️ Магазин ещё не настроен: не указан HTTPS-адрес Mini App (WEBAPP_URL).'
    ].join('\n');
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainMenu() });
  });

  bot.command('myid', (ctx) => ctx.reply(`Ваш Telegram ID: <code>${ctx.from?.id}</code>`, { parse_mode: 'HTML' }));

  async function sendMyOrders(ctx: Context) {
    const list = db.ordersForUser(ctx.from!.id, 5);
    if (list.length === 0) {
      await ctx.reply('У вас пока нет заказов.', { reply_markup: mainMenu() });
      return;
    }
    for (const order of list) await ctx.reply(orderCard(order), { parse_mode: 'HTML' });
  }

  bot.command('my', sendMyOrders);
  bot.callbackQuery('my', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendMyOrders(ctx);
  });

  bot.command('orders', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('Эта команда доступна только администратору.');
    const list = db.ordersForAdmin('active');
    if (list.length === 0) return ctx.reply('Активных заказов нет 🎉');
    for (const order of list) {
      await ctx.reply(orderCard(order, { forAdmin: true }), { parse_mode: 'HTML', reply_markup: adminKeyboard(order) });
    }
  });

  bot.callbackQuery(/^st:(\d+):(\w+)$/, async (ctx) => {
    try {
      const order = orders.changeStatus(Number(ctx.match[1]), ctx.match[2] as OrderStatus, {
        userId: ctx.from.id,
        isAdmin: isAdmin(ctx)
      });
      await ctx.answerCallbackQuery(statusLine(order.status));
      await ctx.editMessageText(orderCard(order, { forAdmin: true }), {
        parse_mode: 'HTML',
        reply_markup: adminKeyboard(order)
      });
    } catch (error) {
      if (!(error instanceof OrderError)) throw error;
      await ctx.answerCallbackQuery({ text: error.message, show_alert: true });
    }
  });

  bot.catch(({ error, ctx }) => {
    const description = error instanceof GrammyError ? error.description : String(error);
    console.error(`Ошибка при обработке update ${ctx.update.update_id}:`, description);
  });

  async function setup() {
    await bot.api.setMyCommands([
      { command: 'start', description: 'Главное меню' },
      { command: 'my', description: 'Мои заказы' }
    ]);
    for (const chatId of adminIds) {
      await bot.api
        .setMyCommands(
          [
            { command: 'start', description: 'Главное меню' },
            { command: 'orders', description: 'Активные заказы' },
            { command: 'my', description: 'Мои заказы' }
          ],
          { scope: { type: 'chat', chat_id: chatId } }
        )
        .catch(() => console.warn(`Администратор ${chatId} ещё не запускал бота — команды появятся позже`));
    }
    if (hasWebApp) {
      await bot.api.setChatMenuButton({
        menu_button: { type: 'web_app', text: 'Магазин', web_app: { url: options.webAppUrl } }
      });
    }
  }

  return { bot, setup };
}
