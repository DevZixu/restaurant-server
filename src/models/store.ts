import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import type { RestaurantStore } from './types.js';

const demoPasswordHash = await argon2.hash('demo-password');

export const store: RestaurantStore = {
  users: [{
    id: 'user-demo-manager', name: 'Jordan Lee', email: 'jordan@example.com',
    passwordHash: demoPasswordHash, role: 'manager', createdAt: new Date().toISOString(),
  }],
  categories: [
    { id: 'cat-mains', name: 'Mains', description: 'Made-to-order favorites' },
    { id: 'cat-sides', name: 'Sides', description: 'Small plates and extras' },
    { id: 'cat-drinks', name: 'Drinks', description: 'Cold and sparkling' },
  ],
  menuItems: [
    { id: 'item-burger', name: 'House Burger', description: 'Smash patty, cheddar, pickles, house sauce', price: 14, categoryId: 'cat-mains', available: true },
    { id: 'item-pizza', name: 'Wild Mushroom Pizza', description: 'Roasted mushrooms, mozzarella, thyme', price: 17.5, categoryId: 'cat-mains', available: true },
    { id: 'item-fries', name: 'Rosemary Fries', description: 'Crisp fries with rosemary salt', price: 6, categoryId: 'cat-sides', available: true },
    { id: 'item-salad', name: 'Market Greens', description: 'Seasonal leaves, citrus vinaigrette', price: 8.5, categoryId: 'cat-sides', available: true },
    { id: 'item-soda', name: 'House Lemonade', description: 'Fresh lemon, a little fizz', price: 4, categoryId: 'cat-drinks', available: true },
  ],
  orders: [{
    id: 'order-sample-01', customerName: 'Avery Chen', status: 'preparing',
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    items: [
      { id: randomUUID(), menuItemId: 'item-burger', quantity: 2, unitPrice: 14 },
      { id: randomUUID(), menuItemId: 'item-soda', quantity: 1, unitPrice: 4 },
    ],
  }],
};