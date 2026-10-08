import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { db } from '../prisma/db.js';
import { optionalString, requireBody, requiredString, routeId } from './shared.js';

export const listCategories: RequestHandler = async (_request, response) => {
  const categories = await db.orm.public.Category.orderBy((category) => category.name.asc()).all();
  response.json(categories);
};

export const getCategory: RequestHandler = async (request, response) => {
  const category = await db.orm.public.Category.where({ id: routeId(request.params['id']) }).first();
  if (!category) throw new HttpError(404, 'Category not found');
  response.json(category);
};

export const createCategory: RequestHandler = async (request, response) => {
  const body = requireBody(request.body);
  const name = requiredString(body['name'], 'Name');
  const description = body['description'] === undefined ? null : optionalString(body['description'], 'Description');
  const category = await db.orm.public.Category.create({ name, description });
  response.status(201).json(category);
};

export const updateCategory: RequestHandler = async (request, response) => {
  const id = routeId(request.params['id']);
  const body = requireBody(request.body);
  const current = await db.orm.public.Category.where({ id }).first();
  if (!current) throw new HttpError(404, 'Category not found');
  const name = body['name'] === undefined ? current.name : requiredString(body['name'], 'Name');
  const description = body['description'] === undefined ? current.description : optionalString(body['description'], 'Description');
  const updated = await db.orm.public.Category.where({ id }).update({ name, description });
  if (!updated) throw new HttpError(404, 'Category not found');
  response.json(updated);
};

export const deleteCategory: RequestHandler = async (request, response) => {
  const deleted = await db.orm.public.Category.where({ id: routeId(request.params['id']) }).delete();
  if (!deleted) throw new HttpError(404, 'Category not found');
  response.status(204).end();
};