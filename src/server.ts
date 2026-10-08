import { app } from './app.js';
import { env } from './config/env.js';
import { ensureAdminAccount } from './prisma/bootstrap-admin.js';

await ensureAdminAccount();

app.listen(env.port, () => {
  console.log(`Restaurant system listening on http://localhost:${env.port}`);
});
