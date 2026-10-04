import 'dotenv/config';

export const env = {
  port: Number(process.env['PORT'] ?? 3000),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  sessionSecret: process.env['SESSION_SECRET'] ?? 'local-development-session-secret-change-me',
};