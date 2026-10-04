import { Router } from 'express';
import { createUser, deleteUser, getUser, listUsers, updateUser } from '../controllers/usersController.js';

export const userRoutes = Router();

userRoutes.get('/', listUsers);
userRoutes.get('/:id', getUser);
userRoutes.post('/', createUser);
userRoutes.put('/:id', updateUser);
userRoutes.delete('/:id', deleteUser);