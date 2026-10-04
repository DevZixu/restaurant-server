import argon2 from 'argon2';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errors.js';
import { store } from '../models/store.js';
import { isRecord, publicUser, requiredString } from './shared.js';

export const health: RequestHandler = (_request, response) => {
  response.json({ status: 'ok', storage: 'in-memory' });
};

export const login: RequestHandler = async (request, response, next) => {
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

export const currentUser: RequestHandler = (request, response) => {
  const user = store.users.find((entry) => entry.id === request.session.userId);
  if (!user) throw new HttpError(401, 'Sign in to access this endpoint');
  response.json({ user: publicUser(user) });
};