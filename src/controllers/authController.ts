import argon2 from 'argon2';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { db } from '../prisma/db.js';
import { ensureValidEmail, isRecord, publicUser, requiredString } from './shared.js';

export const health: RequestHandler = async (_request, response) => {
  await db.orm.public.User.first();
  response.json({ status: 'ok', storage: 'postgresql' });
};

export const login: RequestHandler = async (request, response, next) => {
  try {
    if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
    const email = requiredString(request.body['email'], 'Email').toLowerCase();
    const password = requiredString(request.body['password'], 'Password');
    const user = await db.orm.public.User.where((user) => user.email.ilike(email)).first();
    if (!user || !(await argon2.verify(user.passwordHash, password))) throw new HttpError(401, 'Email or password is incorrect');
    request.session.userId = String(user.id);
    request.session.save((error) => {
      if (error) return next(error);
      response.json({ user: publicUser(user) });
    });
  } catch (error) {
    next(error);
  }
};

export const register: RequestHandler = async (request, response, next) => {
  try {
    if (!isRecord(request.body)) throw new HttpError(400, 'Request body must be an object');
    const name = requiredString(request.body['name'], 'Name');
    const email = requiredString(request.body['email'], 'Email').toLowerCase();
    const password = requiredString(request.body['password'], 'Password');
    ensureValidEmail(email);
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    const passwordHash = await argon2.hash(password);
    const user = await db.orm.public.User.create({ name, email, passwordHash, role: 'staff' });
    request.session.userId = String(user.id);
    request.session.save((error) => {
      if (error) return next(error);
      response.status(201).json({ user: publicUser(user) });
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'sqlState' in error && error.sqlState === '23505') {
      next(new HttpError(409, 'Email is already in use'));
      return;
    }
    next(error);
  }
};

export const logout: RequestHandler = (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie('restaurant.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
    });
    response.status(204).end();
  });
};

export const currentUser: RequestHandler = async (request, response) => {
  const userId = Number(request.session.userId);
  if (!Number.isSafeInteger(userId) || userId < 1) throw new HttpError(401, 'Sign in to access this endpoint');
  const user = await db.orm.public.User.where({ id: userId }).first();
  if (!user) throw new HttpError(401, 'Sign in to access this endpoint');
  response.json({ user: publicUser(user) });
};