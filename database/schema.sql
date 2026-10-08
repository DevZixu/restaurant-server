CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'staff' CHECK ("role" IN ('manager', 'staff')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "menu_items" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" NUMERIC(10, 2) NOT NULL CHECK ("price" >= 0),
  "available" BOOLEAN NOT NULL DEFAULT true,
  "categoryId" INTEGER NOT NULL REFERENCES "categories" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" SERIAL PRIMARY KEY,
  "customerName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  "userId" INTEGER NOT NULL REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "orders" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "menuItemId" INTEGER NOT NULL REFERENCES "menu_items" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "quantity" INTEGER NOT NULL CHECK ("quantity" BETWEEN 1 AND 99),
  "unitPrice" NUMERIC(10, 2) NOT NULL CHECK ("unitPrice" >= 0),
  UNIQUE ("orderId", "menuItemId")
);

CREATE INDEX IF NOT EXISTS "menu_items_categoryId_idx" ON "menu_items" ("categoryId");
CREATE INDEX IF NOT EXISTS "orders_userId_createdAt_idx" ON "orders" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "order_items_menuItemId_idx" ON "order_items" ("menuItemId");
