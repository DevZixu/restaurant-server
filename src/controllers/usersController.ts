import argon2 from 'argon2';
import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { db } from '../prisma/db.js';
import { ensureValidEmail, publicUser, requireBody, requiredString, routeId, validateRole } from './shared.js';

export const listUsers: RequestHandler = async (_request, response) => {
  const users = await db.orm.public.User.all();
  response.json(users.map((user) => publicUser(user)));
};

export const getUser: RequestHandler = async (request, response) => {
  const user = await db.orm.public.User.where({ id: routeId(request.params['id']) }).first();
  if (!user) throw new HttpError(404, 'User not found');
  response.json(publicUser(user));
};

export const createUser: RequestHandler = async (request, response) => {
  const body = requireBody(request.body);
  const name = requiredString(body['name'], 'Name');
  const email = requiredString(body['email'], 'Email').toLowerCase();
  const password = requiredString(body['password'], 'Password');
  ensureValidEmail(email);
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  const role = body['role'] === undefined ? 'staff' : validateRole(body['role']);
  const passwordHash = await argon2.hash(password);
  const user = await db.orm.public.User.create({ name, email, passwordHash, role });
  response.status(201).json(publicUser(user));
};

export const updateUser: RequestHandler = async (request, response) => {
  const id = routeId(request.params['id']);
  const body = requireBody(request.body);
  const user = await db.orm.public.User.where({ id }).first();
  if (!user) throw new HttpError(404, 'User not found');
  const name = body['name'] === undefined ? user.name : requiredString(body['name'], 'Name');
  const email = body['email'] === undefined ? user.email : requiredString(body['email'], 'Email').toLowerCase();
  ensureValidEmail(email);
  const role = body['role'] === undefined ? user.role : validateRole(body['role']);
  let passwordHash = user.passwordHash;
  if (body['password'] !== undefined) {
    const password = requiredString(body['password'], 'Password');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    passwordHash = await argon2.hash(password);
  }
  const updated = await db.orm.public.User.where({ id }).update({ name, email, passwordHash, role });
  if (!updated) throw new HttpError(404, 'User not found');
  response.json(publicUser(updated));
};

export const deleteUser: RequestHandler = async (request, response) => {
  const deleted = await db.orm.public.User.where({ id: routeId(request.params['id']) }).delete();
  if (!deleted) throw new HttpError(404, 'User not found');
  response.status(204).end();
};