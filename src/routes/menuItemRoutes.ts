import { Router } from 'express';
import { createMenuItem, deleteMenuItem, getMenuItem, listMenuItems, updateMenuItem } from '../controllers/menuItemsController.js';

export const menuItemRoutes = Router();

menuItemRoutes.get('/', listMenuItems);
menuItemRoutes.get('/:id', getMenuItem);
menuItemRoutes.post('/', createMenuItem);
menuItemRoutes.put('/:id', updateMenuItem);
menuItemRoutes.delete('/:id', deleteMenuItem);