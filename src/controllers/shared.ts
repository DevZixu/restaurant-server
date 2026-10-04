import { randomUUID } from 'node:crypto';
import { HttpError } from '../middleware/errors.js';
import { store } from '../models/store.js';
import type { MenuItem, Order, OrderItemInput, User } from '../models/types.js';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label} is required`);
  return value.trim();
}

export function optionalString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be a string`);
  return value.trim();
}

export function requireBody(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new HttpError(400, 'Request body must be an object');
  return value;
}

export function findById<T extends { id: string }>(items: T[], id: string, label: string): T {
  const found = items.find((item) => item.id === id);
  if (!found) throw new HttpError(404, `${label} not found`);
  return found;
}

export function publicUser({ passwordHash: _passwordHash, ...user }: User) {
  return user;
}

export function ensureUniqueEmail(email: string, currentId?: string): void {
  if (store.users.some((user) => user.email.toLowerCase() === email.toLowerCase() && user.id !== currentId)) {
    throw new HttpError(409, 'Email is already in use');
  }
}

export function parsePrice(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new HttpError(400, 'Price must be a non-negative number');
  }
  return Number(value.toFixed(2));
}

export function parseMenuItem(body: Record<string, unknown>): MenuItem {
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

export function parseOrderItems(value: unknown): OrderItemInput[] {
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

export function hydrateOrder(order: Order) {
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