# Restaurant Management API

TypeScript, Express, Argon2 password hashing, and cookie-based sessions. This phase uses an in-memory store only; it does not connect to or modify PostgreSQL. Data resets whenever the server restarts.

## Run locally

Requirements: Node.js 20 or newer.

```sh
npm install
cp .env.example .env
# Set SESSION_SECRET in .env to a long random value.
npm run dev
```

The API listens on `http://localhost:3000` by default. `PORT` can change the port. For a compiled run, use `npm run build` and `npm start`.

Demo login: `jordan@example.com` / `demo-password`.

## Sessions

Sign in at `POST /api/auth/login`. The server creates a signed session cookie named `restaurant.sid`; it is `HttpOnly`, `SameSite=Lax`, and uses `Secure` when `NODE_ENV=production`. Send that cookie with subsequent requests. `POST /api/auth/logout` destroys the session, and `GET /api/auth/me` returns the signed-in user. The default Express session store is in-memory for this database-free demo, so sessions do not persist through a server restart.

The seeded demo manager is available for the first login. User passwords are hashed using Argon2id and password hashes are never returned by the API.

## Endpoints

All endpoints except health and authentication require a valid session cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API status |
| POST | `/api/auth/login` | Create session; JSON `{ "email", "password" }` |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Current session user |
| GET, POST | `/api/users` | List or create users |
| GET, PUT, DELETE | `/api/users/:id` | Read, update, or delete a user |
| GET, POST | `/api/categories` | List or create categories |
| GET, PUT, DELETE | `/api/categories/:id` | Read, update, or delete a category |
| GET, POST | `/api/menu-items` | List or create menu items |
| GET, PUT, DELETE | `/api/menu-items/:id` | Read, update, or delete a menu item |
| GET, POST | `/api/orders` | List orders or create an order |
| GET, PUT, DELETE | `/api/orders/:id` | Read, update, or delete an order |

Filter menu items by category with `GET /api/menu-items?categoryId=cat-mains`.

Create an order with one or more menu items:

```json
{
  "customerName": "Avery Chen",
  "items": [
    { "menuItemId": "item-burger", "quantity": 2 },
    { "menuItemId": "item-soda", "quantity": 1 }
  ]
}
```

Order responses include each menu item, saved unit price, line total, and order total. Category deletion is rejected while menu items reference it; menu item deletion is rejected while orders reference it. Invalid input returns `400`, missing records return `404`, duplicate/conflicting data returns `409`, and unauthenticated requests return `401`.

## Sample API flow

```sh
curl -i -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"jordan@example.com","password":"demo-password"}' \
  http://localhost:3000/api/auth/login

curl -b cookies.txt http://localhost:3000/api/menu-items
```

Use the collection in `postman/restaurant-management-api.postman_collection.json` to explore the endpoints. Postman automatically retains the login cookie for later requests.