# Learning Microservices

A NestJS microservices example project demonstrating:

- **API Gateway** (`api-gateway`) — entry point on `:8080`. Authenticates every request with JWT and
  proxies it to the target service via Service Discovery.
- **User Service** (`user-service`) — `:3002`. Registration/login with **bcrypt** password hashing and
  **JWT** issuing. Stores users in its own `user-db` (PostgreSQL `:5434`).
- **Product Service** (`product-service`) — `:3000`, own `product-db` (`:5432`).
- **Order Service** (`order-service`) — `:3001`, own `order-db` (`:5433`) and **Kafka** (`:9092`).
- **Discovery Service** (`discovery-service`) — `:4000`. Services self-register, health checks run
  every 5s, and the gateway resolves the target URL dynamically instead of hardcoding addresses.

Every service has its own database (`Database per Service` pattern), communicates through the
gateway, and publishes/consumes domain events over Kafka.

## Architecture

```
                       ┌──────────────────────┐
   Client ───────────► │   API Gateway :8080   │
                       │ 1) Validate JWT       │
                       │ 2) Proxy req          │
                       └──────┬───────┬────────┘
                              │       │
                    Service Discovery :4000  (resolves target URL)
                              │       │
              ┌───────────────┘       └───────────────┐
              │                                       │
   ┌──────────▼──────────┐                ┌──────────▼──────────┐
   │  User Service :3002 │                │  Order Service :3001│
   │  user-db :5434       │                │  order-db :5433     │
   │  (JWT + bcrypt)      │                └──────────┬──────────┘
   └──────────────────────┘                           │ Kafka :9092
                                               ┌──────▼──────┐
                                               │   Product   │
                                               │ Service:3000│
                                               │ product-db  │
                                               │   :5432     │
                                               └─────────────┘
```

**Authentication flow**

1. Client registers: `POST /users/register` → user-service hashes the password with **bcrypt**
   (`bcrypt.hash(password, 10)`) and stores the user.
2. Client logs in: `POST /users/login` → user-service compares the password with
   `bcrypt.compare` and returns a signed JWT.
3. Client calls a protected route with `Authorization: Bearer <token>`.
4. The gateway's `AuthMiddleware` verifies the JWT, deletes any client-supplied `x-user-id` /
   `x-user-email` headers, and sets them from the verified token payload (`sub` and `email`).
5. The gateway proxies to the target service, which trusts the identity forwarded in those headers.
6. `GET /users/me` returns the current user read from the `x-user-id` header.

JWT payload: `{ sub: <userId>, email: <email> }`, signed with `JWT_SECRET`, expires in **1h**.
No refresh tokens, OAuth, sessions, or Redis are used — stateless JWT only.

## Prerequisites

- Node.js 20+ (this project uses `"type": "module"` and `module: nodenext`)
- Docker + Docker Compose

## Getting Started

```bash
npm install

# 1. Start the databases (and Kafka)
docker compose up -d user-db product-db order-db kafka

# 2. Set up environment variables (only user-db + JWT secret are required)
cp .env.example .env

# 3. Apply the Prisma migrations for every service
npx prisma migrate dev --name init --schema apps/user-service/prisma/schema.prisma
npx prisma migrate deploy --schema apps/product-service/prisma/schema.prisma
npx prisma migrate deploy --schema apps/order-service/prisma/schema.prisma

# 4. Start the services (discovery first, then the rest, gateway last)
npx nest start discovery-service &
npx nest start product-service &
npx nest start order-service &
npx nest start user-service &
npx nest start api-gateway &
```

`.env` must contain:

```env
USER_DATABASE_URL="postgresql://postgres:postgres@localhost:5434/user"
JWT_SECRET="change-this-secret"
```

> `JWT_SECRET` is read from the environment at runtime — it is never hardcoded in source code.
> Change it to a long random value in production.

### Discovery

Services self-register at startup (`POST /discovery/register`). Health is checked every 5 seconds
against `GET /health` on each instance; unhealthy instances are removed. The gateway resolves the
target for a request:

```bash
curl http://localhost:4000/discovery/user-service
```

## API

| Method | Route                    | Auth   | Description                              |
| ------ | ------------------------ | ------ | ---------------------------------------- |
| POST   | `/users/register`        | Public | Create an account                        |
| POST   | `/users/login`           | Public | Get a JWT access token                   |
| GET    | `/users/me`              | JWT    | Current user (from `x-user-id` header)   |
| GET    | `/products` / `/:id`    | JWT    | Product service                          |
| POST   | `/products`              | JWT    | Create a product                         |
| GET    | `/orders` / `/:id`      | JWT    | Order service                             |
| POST   | `/orders`                | JWT    | Create an order                          |

All application routes require a token except `/users/register` and `/users/login`.

### Auth example

```bash
# Register
curl -X POST http://localhost:8080/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
# → {"id":1,"email":"user@example.com"}

# Login
curl -X POST http://localhost:8080/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
# → {"accessToken":"eyJhbGciOi..."}

# Protected route with the token
curl http://localhost:8080/products \
  -H "Authorization: Bearer eyJhbGciOi..."

# Current user (gateway adds x-user-id from the verified token)
curl http://localhost:8080/users/me \
  -H "Authorization: Bearer eyJhbGciOi..."
```

### Gateway auth middleware (`apps/api-gateway/src/auth/auth.middleware.ts`)

```ts
const publicRoutes = ['/users/register', '/users/login'];
if (publicRoutes.some((route) => path === route || path.startsWith(`${route}?`))) {
  return next();
}

const authorization = req.headers.authorization;
// ...
const payload = await this.jwtService.verifyAsync(token);

delete req.headers['x-user-id'];
delete req.headers['x-user-email'];
req.headers['x-user-id'] = String(payload.sub);
req.headers['x-user-email'] = String(payload.email);
next();
```

The middleware is registered **before** `ProxyMiddleware` in `apps/api-gateway/src/proxy/proxy.module.ts`, so authentication always runs before the request is forwarded.

### The proxy middleware (`apps/api-gateway/src/proxy/proxy.middleware.ts`) maps to service names

```ts
const routes = {
  '/users': 'user-service',
  '/products': 'product-service',
  '/orders': 'order-service',
};
```

### User service (`apps/user-service`)

`apps/user-service/prisma/schema.prisma`:

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

The service issues JWTs via `@nestjs/jwt` and hashes passwords with bcrypt. The generated client is
`@prisma/user-client` (per-service generated Prisma client).

## Databases

| Service       | Container   | Host port | Database   |
| ------------- | ----------- | --------- | ---------- |
| Product       | `product-db`| 5432      | `product`  |
| Order         | `order-db`  | 5433      | `order`    |
| User          | `user-db`   | 5434      | `user`     |

## Kafka

The order service publishes order-created events (`order.ORDER_CREATED`) and the product service
consumes them as an outbox relay. Kafka runs on `localhost:9092`.

## Tests

```bash
npm test        # unit tests (vitest)
npm run test:e2e
```

Tests cover registration, duplicate registration, login, invalid login, missing/invalid JWT on
protected routes, valid JWT proxied to services, `/users/me`, and verified identity headers.