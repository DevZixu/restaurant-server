import type { RequestHandler } from 'express';
import { HttpError } from './errors.js';
import { db } from '../prisma/db.js';

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const userId = Number(request.session.userId);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    next(new HttpError(401, 'Sign in to access this endpoint'));
    return;
  }
  try {
    const user = await db.orm.public.User.where({ id: userId }).first();
    if (!user) {
      next(new HttpError(401, 'Sign in to access this endpoint'));
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};