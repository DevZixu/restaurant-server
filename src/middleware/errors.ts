import type { ErrorRequestHandler, RequestHandler } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ error: 'Route not found' });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (code === '23505') {
      response.status(409).json({ error: 'A record with that unique value already exists' });
      return;
    }
    if (code === '23503') {
      response.status(409).json({ error: 'The record is referenced by related data or a referenced record does not exist' });
      return;
    }
    if (code === '23502' || code === '23514' || code === '22P02') {
      response.status(400).json({ error: 'Request contains an invalid or missing field value' });
      return;
    }
  }
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Request body contains invalid JSON' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === '23505') {
      response.status(409).json({ error: 'A record with those unique values already exists' });
      return;
    }
    if (code === '23503') {
      response.status(409).json({ error: 'This record is still referenced by another record' });
      return;
    }
    if (code === '23514' || code === '22P02') {
      response.status(400).json({ error: 'A value is invalid for this resource' });
      return;
    }
  }
  console.error(error);
  response.status(500).json({ error: 'An unexpected server error occurred' });
};