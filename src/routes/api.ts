import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { Router, type RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { store } from '../models/store.js';
import type { Category, MenuItem, Order, OrderItemInput, OrderStatus, User, UserRole } from '../models/types.js';

export const api = Router();

const userRoles: UserRole[] = ['manager', 'staff'];
const orderStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label} is required`);
  return value.trim();
};
const optionalString = (value: unknown, label: string): string => {
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be a string`);
  return value.trim();
};
const findById = <T extends { id: string }>(items: T[], id: string, label: string): T => {
  const found = items.find((item) => item.id === id);
  if (!found) throw new HttpError(404, `${label} not found`);
  return found;
};
const uniqueEmail = (email: string, currentId?: string): void => {
  if (store.users.some((user) => user.email.toLowerCase() === email.toLowerCase() && user.id !== currentId)) {
    throw new HttpError(409, 'Email is already in use');
  }
};
const publicUser = ({ passwordHash: _passwordHash, ...user }: User) => user;

const requireAuth: RequestHandler = (request, _response, next) => {
  if (!request.session.userId || !store.users.some((user) => user.id === request.session.userId)) {
    next(new HttpError(401, 'Sign in to access this endpoint'));
    return;
  }
  next();
};

function parseOrderItems(value: unknown): OrderItemInput[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, 'Order must contain at least one item');
  return value.map((entry) => {
    if (!isRecord(entry)) throw new HttpError(400, 'Each order item must be an object');
    const menuItemId = requiredString(entry['menuItemId'], 'menuItemId');
    const quantity = entry['quantity'];
    if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 99) {
      throw new HttpError(400, 'Item quantity must be a whole number from 1 to 99');
    }
    const menuItem = findById(store.menuItems, menuItemId, 'Menu item');
    if (!menuItem.available) throw new HttpError(400, `${menuItem.name} is not available`);
    return { menuItemId, quantity: Number(quantity) };
  });
}

function hydrateOrder(order: Order) {
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      menuItem: store.menuItems.find((menuItem) => menuItem.id === item.menuItemId) ?? null,
      lineTotal: Number((item.unitPrice * item.quantity).toFixed(2)),
    })),
    total: Number(order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)),
  };
}

function parsePrice(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new HttpError(400, 'Price must be a non-negative number');
  return Number(value.toFixed(2));
}

function parseMenuItem(body: Record<string, unknown>): MenuItem {
  const name = requiredString(body['name'], 'Name');
  const categoryId = requiredString(body['categoryId'], 'Category');
  findById(store.categories, categoryId, 'Category');
  const available = body['available'] ?? true;
  if (typeof available !== 'boolean') throw new HttpError(400, 'Available must be true or false');
  return {
    id: randomUUID(), name,
    description: typeof body['description'] === 'string' ? body['description'].trim() : '',
    price: parsePrice(body['price']), categoryId, available,
  };
}

api.get('/health', (_request, response) => response.json({ status: 'ok', storage: 'in-memory' }));

api.post('/auth/login', async (request, response, next) => {
  try {
    if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
    const email = requiredString(request.body['email'], 'Email').toLowerCase();
    const password = requiredString(request.body['password'], 'Password');
    const user = store.users.find((entry) => entry.email.toLowerCase() === email);
    if (!user || !(await argon2.verify(user.passwordHash, password))) throw new HttpError(401, 'Email or password is incorrect');
    request.session.userId = user.id;
    request.session.save((error) => {
      if (error) return next(error);
      response.json({ user: publicUser(user) });
    });
  } catch (error) {
    next(error);
  }
});

api.post('/auth/logout', (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie('restaurant.sid', { httpOnly: true, sameSite: 'lax', secure: process.env['NODE_ENV'] === 'production' });
    response.status(204).end();
  });
});

api.get('/auth/me', requireAuth, (request, response) => {
  const user = store.users.find((entry) => entry.id === request.session.userId)!;
  response.json({ user: publicUser(user) });
});

api.use(requireAuth);

api.get('/users', (_request, response) => response.json(store.users.map(publicUser)));
api.get('/users/:id', (request, response) => response.json(publicUser(findById(store.users, request.params['id']!, 'User'))));
api.post('/users', async (request, response) => {
  if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
  const name = requiredString(request.body['name'], 'Name');
  const email = requiredString(request.body['email'], 'Email').toLowerCase();
  const password = requiredString(request.body['password'], 'Password');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Email must be valid');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  uniqueEmail(email);
  const requestedRole = request.body['role'] ?? 'staff';
  if (typeof requestedRole !== 'string' || !userRoles.includes(requestedRole as UserRole)) throw new HttpError(400, 'Role must be manager or staff');
  const user: User = { id: randomUUID(), name, email, passwordHash: await argon2.hash(password), role: requestedRole as UserRole, createdAt: new Date().toISOString() };
  store.users.push(user);
  response.status(201).json(publicUser(user));
});
api.put('/users/:id', async (request, response) => {
  const user = findById(store.users, request.params['id']!, 'User');
  if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
  if (request.body['name'] !== undefined) user.name = requiredString(request.body['name'], 'Name');
  if (request.body['email'] !== undefined) {
    const email = requiredString(request.body['email'], 'Email').toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Email must be valid');
    uniqueEmail(email, user.id);
    user.email = email;
  }
  if (request.body['password'] !== undefined) {
    const password = requiredString(request.body['password'], 'Password');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    user.passwordHash = await argon2.hash(password);
  }
  if (request.body['role'] !== undefined) {
    if (typeof request.body['role'] !== 'string' || !userRoles.includes(request.body['role'] as UserRole)) throw new HttpError(400, 'Role must be manager or staff');
    user.role = request.body['role'] as UserRole;
  }
  response.json(publicUser(user));
});
api.delete('/users/:id', (request, response) => {
  const user = findById(store.users, request.params['id']!, 'User');
  store.users.splice(store.users.indexOf(user), 1);
  response.status(204).end();
});

api.get('/categories', (_request, response) => response.json(store.categories));
api.get('/categories/:id', (request, response) => response.json(findById(store.categories, request.params['id']!, 'Category')));
api.post('/categories', (request, response) => {
  if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
  const name = requiredString(request.body['name'], 'Name');
  if (store.categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) throw new HttpError(409, 'Category name already exists');
  const category: Category = { id: randomUUID(), name, description: typeof request.body['description'] === 'string' ? request.body['description'].trim() : '' };
  store.categories.push(category);
  response.status(201).json(category);
});
api.put('/categories/:id', (request, response) => {
  const category = findById(store.categories, request.params['id']!, 'Category');
  if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
  if (request.body['name'] !== undefined) {
    const name = requiredString(request.body['name'], 'Name');
    if (store.categories.some((entry) => entry.id !== category.id && entry.name.toLowerCase() === name.toLowerCase())) throw new HttpError(409, 'Category name already exists');
    category.name = name;
  }
  if (request.body['description'] !== undefined) category.description = optionalString(request.body['description'], 'Description');
  response.json(category);
});
api.delete('/categories/:id', (request, response) => {
  const category = findById(store.categories, request.params['id']!, 'Category');
  if (store.menuItems.some((item) => item.categoryId === category.id)) throw new HttpError(409, 'Move or remove this category menu items before deleting it');
  store.categories.splice(store.categories.indexOf(category), 1);
  response.status(204).end();
});

api.get('/menu-items', (request, response) => {
  const categoryId = request.query['categoryId'];
  const items = typeof categoryId === 'string' ? store.menuItems.filter((item) => item.categoryId === categoryId) : store.menuItems;
  response.json(items.map((item) => ({ ...item, category: store.categories.find((category) => category.id === item.categoryId) ?? null })));
});
api.get('/menu-items/:id', (request, response) => {
  const item = findById(store.menuItems, request.params['id']!, 'Menu item');
  response.json({ ...item, category: store.categories.find((category) => category.id === item.categoryId) ?? null });
});
api.post('/menu-items', (request, response) => {
  if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
  const item = parseMenuItem(request.body);
  store.menuItems.push(item);
  response.status(201).json({ ...item, category: store.categories.find((category) => category.id === item.categoryId) });
});
api.put('/menu-items/:id', (request, response) => {
  const item = findById(store.menuItems, request.params['id']!, 'Menu item');
  if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
  if (request.body['name'] !== undefined) item.name = requiredString(request.body['name'], 'Name');
  if (request.body['description'] !== undefined) item.description = optionalString(request.body['description'], 'Description');
  if (request.body['price'] !== undefined) item.price = parsePrice(request.body['price']);
  if (request.body['categoryId'] !== undefined) {
    const categoryId = requiredString(request.body['categoryId'], 'Category');
    findById(store.categories, categoryId, 'Category');
    item.categoryId = categoryId;
  }
  if (request.body['available'] !== undefined) {
    if (typeof request.body['available'] !== 'boolean') throw new HttpError(400, 'Available must be true or false');
    item.available = request.body['available'];
  }
  response.json({ ...item, category: store.categories.find((category) => category.id === item.categoryId) });
});
api.delete('/menu-items/:id', (request, response) => {
  const item = findById(store.menuItems, request.params['id']!, 'Menu item');
  if (store.orders.some((order) => order.items.some((orderItem) => orderItem.menuItemId === item.id))) throw new HttpError(409, 'Menu item is part of an order and cannot be deleted');
  store.menuItems.splice(store.menuItems.indexOf(item), 1);
  response.status(204).end();
});

api.get('/orders', (_request, response) => response.json(store.orders.map(hydrateOrder)));
api.get('/orders/:id', (request, response) => response.json(hydrateOrder(findById(store.orders, request.params['id']!, 'Order'))));
api.post('/orders', (request, response) => {
  if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
  const customerName = requiredString(request.body['customerName'], 'Customer name');
  const requestedItems = parseOrderItems(request.body['items']);
  const order: Order = {
    id: randomUUID(), customerName, status: 'pending', createdAt: new Date().toISOString(),
    items: requestedItems.map((entry) => ({ id: randomUUID(), ...entry, unitPrice: findById(store.menuItems, entry.menuItemId, 'Menu item').price })),
  };
  store.orders.unshift(order);
  response.status(201).json(hydrateOrder(order));
});
api.put('/orders/:id', (request, response) => {
  const order = findById(store.orders, request.params['id']!, 'Order');
  if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
  if (request.body['customerName'] !== undefined) order.customerName = requiredString(request.body['customerName'], 'Customer name');
  if (request.body['status'] !== undefined) {
    if (typeof request.body['status'] !== 'string' || !orderStatuses.includes(request.body['status'] as OrderStatus)) throw new HttpError(400, 'Invalid order status');
    order.status = request.body['status'] as OrderStatus;
  }
  if (request.body['items'] !== undefined) {
    order.items = parseOrderItems(request.body['items']).map((entry) => ({ id: randomUUID(), ...entry, unitPrice: findById(store.menuItems, entry.menuItemId, 'Menu item').price }));
  }
  response.json(hydrateOrder(order));
});
api.delete('/orders/:id', (request, response) => {
  const order = findById(store.orders, request.params['id']!, 'Order');
  store.orders.splice(store.orders.indexOf(order), 1);
  response.status(204).end();
});