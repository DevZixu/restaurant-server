import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { store } from '../models/store.js';
import { findById, optionalString, parseMenuItem, parsePrice, requireBody, requiredString } from './shared.js';

export const listMenuItems: RequestHandler = (request, response) => {
  const categoryId = request.query['categoryId'];
  const items = typeof categoryId === 'string'
    ? store.menuItems.filter((item) => item.categoryId === categoryId)
    : store.menuItems;
  response.json(items.map((item) => ({
    ...item,
    category: store.categories.find((category) => category.id === item.categoryId) ?? null,
  })));
};

export const getMenuItem: RequestHandler = (request, response) => {
  const item = findById(store.menuItems, request.params['id']!, 'Menu item');
  response.json({ ...item, category: store.categories.find((category) => category.id === item.categoryId) ?? null });
};

export const createMenuItem: RequestHandler = (request, response) => {
  const item = parseMenuItem(requireBody(request.body));
  store.menuItems.push(item);
  response.status(201).json({ ...item, category: store.categories.find((category) => category.id === item.categoryId) });
};

export const updateMenuItem: RequestHandler = (request, response) => {
  const item = findById(store.menuItems, request.params['id']!, 'Menu item');
  const body = requireBody(request.body);
  if (body['name'] !== undefined) item.name = requiredString(body['name'], 'Name');
  if (body['description'] !== undefined) item.description = optionalString(body['description'], 'Description');
  if (body['price'] !== undefined) item.price = parsePrice(body['price']);
  if (body['categoryId'] !== undefined) {
    const categoryId = requiredString(body['categoryId'], 'Category');
    findById(store.categories, categoryId, 'Category');
    item.categoryId = categoryId;
  }
  if (body['available'] !== undefined) {
    if (typeof body['available'] !== 'boolean') throw new HttpError(400, 'Available must be true or false');
    item.available = body['available'];
  }
  response.json({ ...item, category: store.categories.find((category) => category.id === item.categoryId) });
};

export const deleteMenuItem: RequestHandler = (request, response) => {
  const item = findById(store.menuItems, request.params['id']!, 'Menu item');
  if (store.orders.some((order) => order.items.some((orderItem) => orderItem.menuItemId === item.id))) {
    throw new HttpError(409, 'Menu item is part of an order and cannot be deleted');
  }
  store.menuItems.splice(store.menuItems.indexOf(item), 1);
  response.status(204).end();
};