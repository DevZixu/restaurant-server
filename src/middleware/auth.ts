import type { RequestHandler } from 'express';
import { HttpError } from './errors.js';
import { store } from '../models/store.js';

export const requireAuth: RequestHandler = (request, _response, next) => {
  if (!request.session.userId || !store.users.some((user) => user.id === request.session.userId)) {
    next(new HttpError(401, 'Sign in to access this endpoint'));
    return;
  }
  next();
};