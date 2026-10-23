function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name}. Скопируйте .env.example в .env и заполните его.`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  botToken: required('BOT_TOKEN'),
  /** Telegram ID администраторов: им приходят заказы и доступна вкладка «Заказы» */
  adminIds: (process.env.ADMIN_IDS ?? '')
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0),
  /** Публичный HTTPS-адрес, по которому открывается Mini App */
  webAppUrl: process.env.WEBAPP_URL?.trim() ?? '',
  port: Number(process.env.PORT ?? 3000),
  timeZone: process.env.SHOP_TZ ?? 'Europe/Moscow',
  shopName: process.env.SHOP_NAME ?? 'Обжарочная «Зерно»',
  dbPath: process.env.DB_PATH ?? 'data/shop.db',
  /** HTTP-прокси для запросов к Telegram API, если он недоступен напрямую */
  telegramProxy: process.env.TELEGRAM_PROXY?.trim() || null,
  /** Только для локальной разработки: открывать Mini App в обычном браузере от имени этого пользователя */
  devUserId: !isProduction && process.env.DEV_USER_ID ? Number(process.env.DEV_USER_ID) : null
};

process.env.TZ = config.timeZone;
