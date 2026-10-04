import express from 'express';
import { sessionMiddleware } from './config/session.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { apiRoutes } from './routes/index.js';

export const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(sessionMiddleware);
app.use('/api', apiRoutes);
app.use('/api', notFound);
app.use(errorHandler);
