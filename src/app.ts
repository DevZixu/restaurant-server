import express from 'express';
import session from 'express-session';
import { errorHandler, notFound } from './middleware/errors.js';
import { api } from './routes/api.js';

export const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(session({
	name: 'restaurant.sid',
	secret: process.env['SESSION_SECRET'] ?? 'local-development-session-secret-change-me',
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env['NODE_ENV'] === 'production',
		maxAge: 1000 * 60 * 60 * 8,
	},
}));
app.use('/api', api);
app.use('/api', notFound);
app.use(errorHandler);
