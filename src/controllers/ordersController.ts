import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { db } from '../prisma/db.js';
import { parseOrderItems, requireBody, requiredString, routeId, validateOrderStatus } from './shared.js';

function formatOrder(order: any) {
  const items = order.orderItems.map((item: any) => ({
    id: item.id,
    orderId: item.orderId,
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.quantity * Number(item.unitPrice),
    menuItem: {
      id: item.menuItem.id,
      name: item.menuItem.name,
      description: item.menuItem.description,
      price: item.menuItem.price,
      categoryId: item.menuItem.categoryId,
      available: item.menuItem.available,
    },
  }));
  return {
    id: order.id,
    customerName: order.customerName,
    status: order.status,
    userId: order.userId,
    createdAt: order.createdAt,
    items,
    total: items.reduce((total: number, item: { lineTotal: number }) => total + item.lineTotal, 0),
  };
}

export const listOrders: RequestHandler = async (_request, response) => {
  const orders = await db.orm.public.Order
    .include('orderItems', (item) => item.include('menuItem'))
    .orderBy((order) => order.createdAt.desc())
    .all();
  response.json(orders.map(formatOrder));
};

export const getOrder: RequestHandler = async (request, response) => {
  const order = await db.orm.public.Order
    .where({ id: routeId(request.params['id']) })
    .include('orderItems', (item) => item.include('menuItem'))
    .first();
  if (!order) throw new HttpError(404, 'Order not found');
  response.json(formatOrder(order));
};

export const createOrder: RequestHandler = async (request, response) => {
  const body = requireBody(request.body);
  const customerName = requiredString(body['customerName'], 'Customer name');
  const requestedItems = parseOrderItems(body['items']);
  const userId = request.session.userId;
  if (!userId) throw new HttpError(401, 'Sign in to create an order');
  const orderId = await db.transaction(async (tx) => {
    const created = await tx.orm.public.Order.create({ customerName, userId: Number(userId) });
    for (const item of requestedItems) {
      const menu = await tx.orm.public.MenuItem.where({ id: item.menuItemId }).first();
      if (!menu) throw new HttpError(404, 'Menu item not found');
      if (!menu.available) throw new HttpError(400, `${menu.name} is not available`);
      await tx.orm.public.OrderItem.create({
        orderId: created.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menu.price,
      });
    }
    return created.id;
  });
  const order = await db.orm.public.Order.where({ id: orderId })
    .include('orderItems', (item) => item.include('menuItem'))
    .first();
  response.status(201).json(order ? formatOrder(order) : null);
};

export const updateOrder: RequestHandler = async (request, response) => {
  const id = routeId(request.params['id']);
  const body = requireBody(request.body);
  const updated = await db.transaction(async (tx) => {
    const current = await tx.orm.public.Order.where({ id }).first();
    if (!current) throw new HttpError(404, 'Order not found');
    const customerName = body['customerName'] === undefined ? current.customerName : requiredString(body['customerName'], 'Customer name');
    const status = body['status'] === undefined ? current.status : validateOrderStatus(body['status']);
    const order = await tx.orm.public.Order.where({ id }).update({ customerName, status });
    if (!order) throw new HttpError(404, 'Order not found');
    if (body['items'] !== undefined) {
      const items = parseOrderItems(body['items']);
      await tx.orm.public.OrderItem.where({ orderId: id }).deleteAll();
      for (const item of items) {
        const menu = await tx.orm.public.MenuItem.where({ id: item.menuItemId }).first();
        if (!menu) throw new HttpError(404, 'Menu item not found');
        if (!menu.available) throw new HttpError(400, `${menu.name} is not available`);
        await tx.orm.public.OrderItem.create({
          orderId: id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menu.price,
        });
      }
    }
    return order.id;
  });
  const order = await db.orm.public.Order.where({ id: updated })
    .include('orderItems', (item) => item.include('menuItem'))
    .first();
  response.json(order ? formatOrder(order) : null);
};

export const deleteOrder: RequestHandler = async (request, response) => {
  const deleted = await db.orm.public.Order.where({ id: routeId(request.params['id']) }).delete();
  if (!deleted) throw new HttpError(404, 'Order not found');
  response.status(204).end();
};