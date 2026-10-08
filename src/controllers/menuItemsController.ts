import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { db } from '../prisma/db.js';
import { normalizeMenuItem, normalizePrice, optionalString, requireBody, requiredString, routeId } from './shared.js';

export const listMenuItems: RequestHandler = async (request, response) => {
  const categoryId = request.query['categoryId'];
  let query = db.orm.public.MenuItem.include('category').orderBy((item) => item.name.asc());
  if (typeof categoryId === 'string') query = query.where({ categoryId: routeId(categoryId) });
  response.json(await query.all());
};

export const getMenuItem: RequestHandler = async (request, response) => {
  const item = await db.orm.public.MenuItem.where({ id: routeId(request.params['id']) }).include('category').first();
  if (!item) throw new HttpError(404, 'Menu item not found');
  response.json(item);
};

export const createMenuItem: RequestHandler = async (request, response) => {
  const item = normalizeMenuItem(requireBody(request.body));
  const created = await db.orm.public.MenuItem.create({ ...item, price: item.price.toFixed(2) });
  const withCategory = await db.orm.public.MenuItem.where({ id: created.id }).include('category').first();
  response.status(201).json(withCategory);
};

export const updateMenuItem: RequestHandler = async (request, response) => {
  const id = routeId(request.params['id']);
  const body = requireBody(request.body);
  const current = await db.orm.public.MenuItem.where({ id }).first();
  if (!current) throw new HttpError(404, 'Menu item not found');
  const name = body['name'] === undefined ? current.name : requiredString(body['name'], 'Name');
  const description = body['description'] === undefined ? current.description : optionalString(body['description'], 'Description');
  const price = body['price'] === undefined ? Number(current.price) : normalizePrice(body['price']);
  const categoryId = body['categoryId'] === undefined ? current.categoryId : routeId(body['categoryId']);
  const available = body['available'] === undefined ? current.available : body['available'];
  if (typeof available !== 'boolean') throw new HttpError(400, 'Available must be true or false');
  const updated = await db.orm.public.MenuItem.where({ id }).update({ name, description, price: price.toFixed(2), available, categoryId });
  if (!updated) throw new HttpError(404, 'Menu item not found');
  const withCategory = await db.orm.public.MenuItem.where({ id: updated.id }).include('category').first();
  response.json(withCategory);
};

export const deleteMenuItem: RequestHandler = async (request, response) => {
  const deleted = await db.orm.public.MenuItem.where({ id: routeId(request.params['id']) }).delete();
  if (!deleted) throw new HttpError(404, 'Menu item not found');
  response.status(204).end();
};