import 'dotenv/config';
import argon2 from 'argon2';
import type { FieldOutputTypes } from './contract.d.js';
import { db } from './db.js';

type SeedMenuItem = FieldOutputTypes['public']['MenuItem'];

async function seed() {
  const customerPasswordHash = await argon2.hash(`customer-demo-${crypto.randomUUID()}`);
  const customer = await db.orm.public.User.upsert({
    create: {
      name: 'Avery Chen',
      email: 'avery@example.com',
      passwordHash: customerPasswordHash,
      role: 'staff',
    },
    update: {},
    conflictOn: { email: 'avery@example.com' },
  });

  const categorySeeds = [
    { name: 'Mains', description: 'Made-to-order favorites' },
    { name: 'Sides', description: 'Small plates and extras' },
    { name: 'Drinks', description: 'Cold and sparkling' },
  ];
  const categories = await Promise.all(categorySeeds.map((category) => db.orm.public.Category.upsert({
    create: category,
    update: { description: category.description },
    conflictOn: { name: category.name },
  })));
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));

  const menuSeeds = [
    { name: 'House Burger', description: 'Smash patty, cheddar, pickles, house sauce', price: '14.00', category: 'Mains' },
    { name: 'Wild Mushroom Pizza', description: 'Roasted mushrooms, mozzarella, thyme', price: '17.50', category: 'Mains' },
    { name: 'Rosemary Fries', description: 'Crisp fries with rosemary salt', price: '6.00', category: 'Sides' },
    { name: 'Market Greens', description: 'Seasonal leaves, citrus vinaigrette', price: '8.50', category: 'Sides' },
    { name: 'House Lemonade', description: 'Fresh lemon, a little fizz', price: '4.00', category: 'Drinks' },
  ];
  const menuItems: (SeedMenuItem | null)[] = [];
  for (const item of menuSeeds) {
    const categoryId = categoryIds.get(item.category);
    if (categoryId === undefined) throw new Error(`Missing category: ${item.category}`);
    const existing = await db.orm.public.MenuItem.where({ name: item.name }).first();
    const data = {
      name: item.name,
      description: item.description,
      price: item.price,
      available: true,
      categoryId,
    };
    menuItems.push(existing
      ? await db.orm.public.MenuItem.where({ id: existing.id }).update(data)
      : await db.orm.public.MenuItem.create(data));
  }

  const existingOrder = await db.orm.public.Order
    .where({ customerName: 'Avery Chen', userId: customer.id, status: 'preparing' })
    .first();
  if (!existingOrder) {
    await db.transaction(async (tx) => {
      const order = await tx.orm.public.Order.create({
        customerName: 'Avery Chen',
        status: 'preparing',
        userId: customer.id,
      });
      const burger = menuItems.find((item) => item?.name === 'House Burger');
      const lemonade = menuItems.find((item) => item?.name === 'House Lemonade');
      if (!burger || !lemonade) throw new Error('Sample menu items were not created');
      await tx.orm.public.OrderItem.create({ orderId: order.id, menuItemId: burger.id, quantity: 2, unitPrice: burger.price });
      await tx.orm.public.OrderItem.create({ orderId: order.id, menuItemId: lemonade.id, quantity: 1, unitPrice: lemonade.price });
    });
  }

  console.log('Seeded sample customer, categories, menu items, and order. Configure the admin via ADMIN_EMAIL and ADMIN_PASSWORD in .env.');
}

try {
  await seed();
} finally {
  await db.close();
}
