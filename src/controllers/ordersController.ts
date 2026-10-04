import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { store } from '../models/store.js';
import type { Order, OrderStatus } from '../models/types.js';
import { findById, hydrateOrder, parseOrderItems, requireBody, requiredString } from './shared.js';

const statuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

export const listOrders: RequestHandler = (_request, response) => response.json(store.orders.map(hydrateOrder));

export const getOrder: RequestHandler = (request, response) => {
  response.json(hydrateOrder(findById(store.orders, request.params['id']!, 'Order')));
};

export const createOrder: RequestHandler = (request, response) => {
  const body = requireBody(request.body);
  const customerName = requiredString(body['customerName'], 'Customer name');
  const requestedItems = parseOrderItems(body['items']);
  const order: Order = {
    id: randomUUID(), customerName, status: 'pending', createdAt: new Date().toISOString(),
    items: requestedItems.map((entry) => ({
      id: randomUUID(), ...entry,
      unitPrice: findById(store.menuItems, entry.menuItemId, 'Menu item').price,
    })),
  };
  store.orders.unshift(order);
  response.status(201).json(hydrateOrder(order));
};

export const updateOrder: RequestHandler = (request, response) => {
  const order = findById(store.orders, request.params['id']!, 'Order');
  const body = requireBody(request.body);
  if (body['customerName'] !== undefined) order.customerName = requiredString(body['customerName'], 'Customer name');
  if (body['status'] !== undefined) {
    if (typeof body['status'] !== 'string' || !statuses.includes(body['status'] as OrderStatus)) {
      throw new HttpError(400, 'Invalid order status');
    }
    order.status = body['status'] as OrderStatus;
  }
  if (body['items'] !== undefined) {
    order.items = parseOrderItems(body['items']).map((entry) => ({
      id: randomUUID(), ...entry,
      unitPrice: findById(store.menuItems, entry.menuItemId, 'Menu item').price,
    }));
  }
  response.json(hydrateOrder(order));
};

export const deleteOrder: RequestHandler = (request, response) => {
  const order = findById(store.orders, request.params['id']!, 'Order');
  store.orders.splice(store.orders.indexOf(order), 1);
  response.status(204).end();
};