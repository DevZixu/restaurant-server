import { Router } from 'express';
import { currentUser, health, login, logout } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes = Router();

authRoutes.get('/health', health);
authRoutes.post('/auth/login', login);
authRoutes.post('/auth/logout', logout);
authRoutes.get('/auth/me', requireAuth, currentUser);