# Restaurant Management API

## Overview

The API is served under `/api`. The included `.env` sets the base URL to `http://localhost:5000`; without `PORT`, the default is `3000`. JSON request bodies are limited to 1 MB. API records are persisted in PostgreSQL; the default Express session store is in memory, so sessions reset when the server restarts.

All endpoints except `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/logout` require a signed-in session. Registration and login set the `restaurant.sid` cookie. Send that cookie with later requests; Postman retains it automatically. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production. `GET /api/auth/me` returns the signed-in user.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health status; no authentication required. |
| `POST` | `/api/auth/register` | Create a staff account and start a session. |
| `POST` | `/api/auth/login` | Sign in with email and password; sets the session cookie. |
| `POST` | `/api/auth/logout` | Destroy the current session; returns no body (`204`). |
| `GET` | `/api/auth/me` | Get the signed-in user. |
| `GET`, `POST` | `/api/users` | List users or create a user. |
| `GET`, `PUT`, `DELETE` | `/api/users/:id` | Read, update, or delete a user. |
| `GET`, `POST` | `/api/categories` | List categories or create a category. |
| `GET`, `PUT`, `DELETE` | `/api/categories/:id` | Read, update, or delete a category. |
| `GET`, `POST` | `/api/menu-items` | List menu items or create one. Supports the `categoryId` query filter. |
| `GET`, `PUT`, `DELETE` | `/api/menu-items/:id` | Read, update, or delete a menu item. |
| `GET`, `POST` | `/api/orders` | List orders or create an order. |
| `GET`, `PUT`, `DELETE` | `/api/orders/:id` | Read, update, or delete an order. |

`PUT` endpoints accept partial objects: include only the fields to change.

## Request Bodies

All bodies are JSON objects. Fields not marked optional are required on create.

### Authentication

`POST /api/auth/register`

```json
{
  "name": "Sam Rivera",
  "email": "sam@example.com",
  "password": "sample-pass-123"
}
```

All fields are required. Email must be valid and unique; passwords must contain at least 8 characters. Registration always assigns the `staff` role and signs the new user in. The response is `201` with `{ "user": { "id", "name", "email", "role", "createdAt" } }` and a session cookie. A duplicate email returns `409`.

`POST /api/auth/login`

```json
{
  "email": "admin@restaurant.local",
  "password": "<value of ADMIN_PASSWORD in .env>"
}
```

Returns `{ "user": { "id", "name", "email", "role", "createdAt" } }`. The admin account is configured with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (password minimum 8 characters), then created or promoted at server startup or with `npm run db:admin`.

### Users

`POST /api/users`

```json
{
  "name": "Sam Rivera",
  "email": "sam@example.com",
  "password": "sample-pass-123",
  "role": "staff"
}
```

`name`, `email`, and `password` are required. `role` is optional and defaults to `staff`; public user creation accepts `manager` or `staff`. The `admin` role is reserved for the env-driven bootstrap. Email must be valid and unique; passwords must contain at least 8 characters. User responses never include password hashes.

### Categories

`POST /api/categories`

```json
{
  "name": "Desserts",
  "description": "Something sweet"
}
```

`name` is required and unique (case-insensitive). `description` is optional and defaults to an empty string.

### Menu Items

`POST /api/menu-items`

```json
{
  "name": "Chocolate Cake",
  "description": "Dark chocolate ganache",
  "price": 7.5,
  "categoryId": 1,
  "available": true
}
```

`name`, `price`, and an existing integer `categoryId` are required. `price` must be a non-negative number and is rounded to two decimal places. `description` defaults to an empty string and `available` defaults to `true`. Filter the list with `GET /api/menu-items?categoryId=1` (use an ID returned by `GET /api/categories`).

### Orders

`POST /api/orders`

```json
{
  "customerName": "Avery Chen",
  "items": [
    { "menuItemId": 1, "quantity": 2 },
    { "menuItemId": 5, "quantity": 1 }
  ]
}
```

`customerName` and a non-empty `items` array are required. Each item must reference an available menu item and have an integer `quantity` from 1 to 99. The API stores each item's unit price at order creation and returns hydrated menu item data, line totals, and the order total. Order status defaults to `pending`; updates may set it to `pending`, `preparing`, `ready`, `completed`, or `cancelled`.

## Responses and Errors

Successful reads and updates return JSON. Creates return `201` and the created resource. Deletes and logout return `204` with no body. Database IDs and foreign keys are integers; timestamps are ISO 8601 strings.

Errors use `{ "error": "message" }`:

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, invalid body, or invalid field value. |
| `401` | Missing/invalid session or incorrect login credentials. |
| `404` | Unknown API route or requested record. |
| `409` | Duplicate email/category name or a deletion blocked by related records. |
| `500` | Unexpected server error. |

Deleting a category is rejected while it contains menu items. Deleting a menu item is rejected while it appears in an order. The API has no role-based authorization: any authenticated user can access the management endpoints.

## Seeded Records

Run `npx prisma db update` to create/update tables, configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run `npm run db:admin` or start the server to create/promote the admin. `npm run db:seed` is optional sample customer/menu/order data. IDs are generated integers; get current IDs from the corresponding list endpoints rather than assuming fixed values.

## Postman

Import [`postman/restaurant-management-api.postman_collection.json`](postman/restaurant-management-api.postman_collection.json) into Postman. Set the collection's `baseUrl` variable if the server runs elsewhere. Run **Register** or **Login** before authenticated requests; Postman stores the session cookie automatically. The create-order request saves its returned ID to the collection's `orderId` variable.