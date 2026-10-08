import 'dotenv/config';

export const env = {
  port: Number(process.env['PORT'] ?? 3000),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  sessionSecret: process.env['SESSION_SECRET'] ?? 'local-development-session-secret-change-me',
  adminName: process.env['ADMIN_NAME'] ?? 'Restaurant Admin',
  adminEmail: process.env['ADMIN_EMAIL']?.trim().toLowerCase(),
  adminPassword: process.env['ADMIN_PASSWORD'],
};