import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import fastifyCompress from '@fastify/compress';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';

import type { Database } from './db.ts';
import { formatDateTime } from './format.ts';
import { COURIER_FEE, FREE_DELIVERY_FROM, nextStatuses, statusLabels } from './pricing.ts';
import { OrderError, type OrderService } from './order-service.ts';
import { displayName, validateInitData } from './telegram-auth.ts';
import type { Order, OrderStatus, TelegramUser } from './types.ts';

declare module 'fastify' {
  interface FastifyRequest {
    tgUser: TelegramUser;
  }
}

type ApiOptions = {
  db: Database;
  orders: OrderService;
  botToken: string;
  isAdmin: (userId: number) => boolean;
  shopName: string;
  devUserId: number | null;
  webappDist?: string;
};

const errorStatus: Record<OrderError['code'], number> = {
  invalid: 400,
  unavailable: 409,
  not_found: 404,
  forbidden: 403,
  bad_status: 409
};

const ORDER_STATUSES = Object.keys(statusLabels) as OrderStatus[];

/** Заказ в виде, удобном для Mini App: подписи статусов и даты уже готовы */
const orderDto = (order: Order, forAdmin: boolean) => ({
  ...order,
  userId: undefined,
  createdLabel: formatDateTime(order.createdAt),
  statusLabel: statusLabels[order.status],
  // Покупателю показываем только отмену нового заказа, администратору — все допустимые переходы
  nextStatuses: forAdmin ? nextStatuses[order.status] : order.status === 'new' ? ['cancelled'] : []
});

export function createApi(options: ApiOptions) {
  const { db, orders } = options;
  const app = Fastify({ logger: { level: 'warn' } });

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith('/api/')) return;

    const header = request.headers.authorization ?? '';
    const initData = header.startsWith('tma ') ? header.slice(4) : '';
    const user = initData ? validateInitData(initData, options.botToken) : null;

    if (user) {
      request.tgUser = user;
    } else if (options.devUserId && !initData) {
      request.tgUser = { id: options.devUserId, first_name: 'Разработчик' };
    } else {
      return reply.code(401).send({ error: 'Откройте магазин через Telegram' });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof OrderError) {
      return reply.code(errorStatus[error.code]).send({ error: error.message, code: error.code });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'Что-то пошло не так. Попробуйте ещё раз' });
  });

  app.get('/api/me', async (request) => ({
    id: request.tgUser.id,
    name: [request.tgUser.first_name, request.tgUser.last_name].filter(Boolean).join(' '),
    isAdmin: options.isAdmin(request.tgUser.id),
    shopName: options.shopName,
    courierFee: COURIER_FEE,
    freeDeliveryFrom: FREE_DELIVERY_FROM
  }));

  app.get('/api/catalog', async () => ({ categories: db.listCategories(), products: db.listProducts() }));

  app.post<{ Body: Record<string, unknown> }>('/api/orders', async (request, reply) => {
    const body = request.body ?? {};
    const items = Array.isArray(body.items)
      ? body.items.map((i: { productId?: unknown; qty?: unknown }) => ({ productId: Number(i?.productId), qty: Number(i?.qty) }))
      : [];
    const order = orders.createOrder({
      userId: request.tgUser.id,
      customerName: typeof body.name === 'string' ? body.name : displayName(request.tgUser),
      phone: typeof body.phone === 'string' ? body.phone : '',
      delivery: body.delivery === 'courier' ? 'courier' : 'pickup',
      address: typeof body.address === 'string' ? body.address : '',
      comment: typeof body.comment === 'string' ? body.comment : '',
      items
    });
    return reply.code(201).send(orderDto(order, false));
  });

  app.get('/api/orders/my', async (request) =>
    db.ordersForUser(request.tgUser.id).map((o) => orderDto(o, false))
  );

  app.post<{ Params: { id: string }; Body: { status?: unknown } }>('/api/orders/:id/status', async (request, reply) => {
    const id = Number(request.params.id);
    const status = request.body?.status as OrderStatus;
    if (!Number.isInteger(id) || !ORDER_STATUSES.includes(status)) {
      return reply.code(400).send({ error: 'Некорректный запрос' });
    }
    const isAdmin = options.isAdmin(request.tgUser.id);
    return orderDto(orders.changeStatus(id, status, { userId: request.tgUser.id, isAdmin }), isAdmin);
  });

  app.get<{ Querystring: { filter?: string } }>('/api/admin/orders', async (request, reply) => {
    if (!options.isAdmin(request.tgUser.id)) return reply.code(403).send({ error: 'Только для администратора' });
    const filter = request.query.filter === 'all' ? 'all' : 'active';
    return db.ordersForAdmin(filter).map((o) => orderDto(o, true));
  });

  if (options.webappDist && existsSync(options.webappDist)) {
    app.register(fastifyCompress);
    app.register(fastifyStatic, { root: resolve(options.webappDist) });
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith('/api/') ? reply.code(404).send({ error: 'Не найдено' }) : reply.sendFile('index.html')
    );
  }

  return app;
}
