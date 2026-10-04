import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import type { RequestHandler } from 'express';
import { HttpError } from '../middleware/errors.js';
import { store } from '../models/store.js';
import type { User, UserRole } from '../models/types.js';
import { ensureUniqueEmail, findById, publicUser, requireBody, requiredString } from './shared.js';

const roles: UserRole[] = ['manager', 'staff'];

export const listUsers: RequestHandler = (_request, response) => {
  response.json(store.users.map(publicUser));
};

export const getUser: RequestHandler = (request, response) => {
  response.json(publicUser(findById(store.users, request.params['id']!, 'User')));
};

export const createUser: RequestHandler = async (request, response) => {
  const body = requireBody(request.body);
  const name = requiredString(body['name'], 'Name');
  const email = requiredString(body['email'], 'Email').toLowerCase();
  const password = requiredString(body['password'], 'Password');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Email must be valid');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  ensureUniqueEmail(email);
  const role = body['role'] ?? 'staff';
  if (typeof role !== 'string' || !roles.includes(role as UserRole)) throw new HttpError(400, 'Role must be manager or staff');
  const user: User = {
    id: randomUUID(), name, email,
    passwordHash: await argon2.hash(password),
    role: role as UserRole,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  response.status(201).json(publicUser(user));
};

export const updateUser: RequestHandler = async (request, response) => {
  const user = findById(store.users, request.params['id']!, 'User');
  const body = requireBody(request.body);
  if (body['name'] !== undefined) user.name = requiredString(body['name'], 'Name');
  if (body['email'] !== undefined) {
    const email = requiredString(body['email'], 'Email').toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Email must be valid');
    ensureUniqueEmail(email, user.id);
    user.email = email;
  }
  if (body['password'] !== undefined) {
    const password = requiredString(body['password'], 'Password');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    user.passwordHash = await argon2.hash(password);
  }
  if (body['role'] !== undefined) {
    if (typeof body['role'] !== 'string' || !roles.includes(body['role'] as UserRole)) throw new HttpError(400, 'Role must be manager or staff');
    user.role = body['role'] as UserRole;
  }
  response.json(publicUser(user));
};

export const deleteUser: RequestHandler = (request, response) => {
  const user = findById(store.users, request.params['id']!, 'User');
  store.users.splice(store.users.indexOf(user), 1);
  response.status(204).end();
};