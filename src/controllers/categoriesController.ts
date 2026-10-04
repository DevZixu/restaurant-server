import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { store } from '../models/store.js';
import type { Category } from '../models/types.js';
import { findById, optionalString, requireBody, requiredString } from './shared.js';

export const listCategories: RequestHandler = (_request, response) => response.json(store.categories);

export const getCategory: RequestHandler = (request, response) => {
  response.json(findById(store.categories, request.params['id']!, 'Category'));
};

export const createCategory: RequestHandler = (request, response) => {
  const body = requireBody(request.body);
  const name = requiredString(body['name'], 'Name');
  if (store.categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    throw new HttpError(409, 'Category name already exists');
  }
  const category: Category = {
    id: randomUUID(), name,
    description: typeof body['description'] === 'string' ? body['description'].trim() : '',
  };
  store.categories.push(category);
  response.status(201).json(category);
};

export const updateCategory: RequestHandler = (request, response) => {
  const category = findById(store.categories, request.params['id']!, 'Category');
  const body = requireBody(request.body);
  if (body['name'] !== undefined) {
    const name = requiredString(body['name'], 'Name');
    if (store.categories.some((entry) => entry.id !== category.id && entry.name.toLowerCase() === name.toLowerCase())) {
      throw new HttpError(409, 'Category name already exists');
    }
    category.name = name;
  }
  if (body['description'] !== undefined) category.description = optionalString(body['description'], 'Description');
  response.json(category);
};

export const deleteCategory: RequestHandler = (request, response) => {
  const category = findById(store.categories, request.params['id']!, 'Category');
  if (store.menuItems.some((item) => item.categoryId === category.id)) {
    throw new HttpError(409, 'Move or remove this category menu items before deleting it');
  }
  store.categories.splice(store.categories.indexOf(category), 1);
  response.status(204).end();
};