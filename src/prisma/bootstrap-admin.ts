import 'dotenv/config';
import argon2 from 'argon2';
import { env } from '../config/env.js';
import { ensureValidEmail } from '../controllers/shared.js';
import { db } from './db.js';

export async function ensureAdminAccount(): Promise<void> {
  const { adminEmail, adminName, adminPassword } = env;
  if (!adminEmail || !adminPassword) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before starting the server');
  }
  if (adminPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }
  ensureValidEmail(adminEmail);

  const passwordHash = await argon2.hash(adminPassword);
  await db.orm.public.User.upsert({
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
    },
    update: {
      name: adminName,
      passwordHash,
      role: 'admin',
    },
    conflictOn: { email: adminEmail },
  });
}

if (process.argv[1]?.endsWith('bootstrap-admin.ts')) {
  try {
    await ensureAdminAccount();
    console.log(`Admin account configured for ${env.adminEmail}`);
  } finally {
    await db.close();
  }
}
