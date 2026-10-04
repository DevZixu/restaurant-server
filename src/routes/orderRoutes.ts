import { Router } from 'express';
import { createOrder, deleteOrder, getOrder, listOrders, updateOrder } from '../controllers/ordersController.js';

export const orderRoutes = Router();

orderRoutes.get('/', listOrders);
orderRoutes.get('/:id', getOrder);
orderRoutes.post('/', createOrder);
orderRoutes.put('/:id', updateOrder);
orderRoutes.delete('/:id', deleteOrder);