import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authRoutes } from './authRoutes.js';
import { categoryRoutes } from './categoryRoutes.js';
import { menuItemRoutes } from './menuItemRoutes.js';
import { orderRoutes } from './orderRoutes.js';
import { userRoutes } from './userRoutes.js';

export const apiRoutes = Router();

apiRoutes.use(authRoutes);
apiRoutes.use(requireAuth);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/categories', categoryRoutes);
apiRoutes.use('/menu-items', menuItemRoutes);
apiRoutes.use('/orders', orderRoutes);