import { HttpError } from '../middleware/errors.js';
import type { OrderItemInput, OrderStatus, UserRole } from '../models/types.js';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label} is required`);
  return value.trim();
}

export function routeId(value: unknown): number {
  const id = Number(requiredString(value, 'Resource id'));
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'Resource id must be a positive integer');
  return id;
}

export function optionalString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new HttpError(400, `${label} must be a string`);
  return value.trim();
}

export function requireBody(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new HttpError(400, 'Request body must be an object');
  return value;
}

export function publicUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function ensureValidEmail(email: string): void {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Email must be valid');
}

export function validateRole(value: unknown): UserRole {
  if (value !== 'manager' && value !== 'staff') throw new HttpError(400, 'Role must be manager or staff');
  return value;
}

export function validateOrderStatus(value: unknown): OrderStatus {
  if (value !== 'pending' && value !== 'preparing' && value !== 'ready' && value !== 'completed' && value !== 'cancelled') {
    throw new HttpError(400, 'Invalid order status');
  }
  return value;
}

export function normalizePrice(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new HttpError(400, 'Price must be a non-negative number');
  }
  return Number(value.toFixed(2));
}

export function normalizeMenuItem(body: Record<string, unknown>) {
  const name = requiredString(body['name'], 'Name');
  const categoryId = routeId(body['categoryId']);
  const description = body['description'] === undefined ? null : optionalString(body['description'], 'Description');
  const available = body['available'] ?? true;
  if (typeof available !== 'boolean') throw new HttpError(400, 'Available must be true or false');
  return { name, categoryId, description, price: normalizePrice(body['price']), available };
}

export function parseOrderItems(value: unknown): OrderItemInput[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, 'Order must contain at least one item');
  const items = value.map((entry) => {
    if (!isRecord(entry)) throw new HttpError(400, 'Each order item must be an object');
    const menuItemId = routeId(entry['menuItemId']);
    const quantity = entry['quantity'];
    if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 99) {
      throw new HttpError(400, 'Item quantity must be a whole number from 1 to 99');
    }
    return { menuItemId, quantity: Number(quantity) };
  });
  if (new Set(items.map((item) => item.menuItemId)).size !== items.length) {
    throw new HttpError(400, 'Each menu item can appear only once per order; combine its quantity');
  }
  return items;
}