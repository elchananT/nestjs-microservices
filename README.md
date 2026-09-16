# Learning Microservices — Database per Service + Outbox Pattern

End-to-end walkthrough of the second lesson in this monorepo: each microservice gets its **own PostgreSQL database**, the **outbox pattern** is used to publish domain events over Kafka, and the order service keeps a **read-model copy** of products (`product_copy`) in its own database.

> Status: **implemented and verified end-to-end** (`git reset` instructions at the bottom if you want to re-apply these steps by hand).

---

## 1. Architecture

```
┌────────────────────────────┐        ┌────────────────────────────┐
│ product-service (3000)     │        │  order-service (3001)      │
│                            │        │                            │
│  POST /products            │        │  POST /orders              │
│   └─ product-db (5432)     │        │   └─ order-db (5433)       │
│       - Product            │        │       - Order              │
│       - OutboxEvent        │        │       - ProductCopy (copy) │
│                            │        │                            │
│  OUTBOX RELAY (2s poll)    │        │  GET /orders/:id           │
│   └─ emits "product.created" ───────▶  └─ reads Order + ProductCopy
└────────────────────────────┘  Kafka  └────────────────────────────┘
```

Flow of the outbox pattern:

1. `POST /products` → `product_service` inserts the `Product` **and** a `OutboxEvent` row with `status = PENDING` inside a **single transaction** (event is never lost).
2. `OutboxRelayService` polls every 2s for `PENDING` rows and emits each one to Kafka topic `product.created`.
3. `order-service`'s `ProductCreatedListener` consumes `product.created` and **upserts** a `ProductCopy` row in `order-db`.
4. `GET /orders/:id` returns the `Order` plus its `ProductCopy` — the product name/price is served entirely from `order-db`, no HTTP/gRPC round-trip at read time.

Result: **data consistency without distributed transactions** — the source of truth is `product-db`, and `order-db` holds a denormalized copy kept in sync via events.

---

## 2. Dependencies added

Only two new packages (both for Prisma):

```bash
npm install @prisma/client@6.19.3        # runtime client  (dependencies)
npm install -D prisma@6.19.3             # CLI (devDependencies)
```

`package.json` changes:

```jsonc
"dependencies": {
  // ...
  "@prisma/client": "^6.19.3",
},
"devDependencies": {
  // ...
  "prisma": "^6.19.3",
}
```

> ⚠️ **Prisma 8 breaking change:** a plain `npm i -D prisma` currently installs `prisma@8.0.0-rc` whose CLI has **no** `migrate dev` / `generate` commands (it uses `prisma migration plan`, `prisma db init`, …). Pin to **Prisma 6** with the commands above.
>
> No changes were needed to `tsconfig.json` / `tsconfig.app.json`. TypeScript already resolves the generated clients from `node_modules` with `moduleResolution: nodenext` + `resolvePackageJsonExports: true` (each generated client ships a `types: index.d.ts`). **No tsconfig edits are required for this feature.**

---

## 3. Infrastructure — `docker-compose.yml`

Added **two Postgres databases** next to the existing Kafka service. Each service owns exactly one database.

```yaml
services:
  kafka:            # (already existed)
    image: apache/kafka:latest
    # ... KRaft setup with KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"

  product-db:
    image: postgres:16
    container_name: product-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: product
      POSTGRES_PASSWORD: product
      POSTGRES_DB: product
    ports:
      - "5432:5432"          # product service only
    volumes:
      - product-db-data:/var/lib/postgresql/data

  order-db:
    image: postgres:16
    container_name: order-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: order
      POSTGRES_PASSWORD: order
      POSTGRES_DB: order
    ports:
      - "5433:5432"          # host 5433 → container 5432 (order service only)
    volumes:
      - order-db-data:/var/lib/postgresql/data

volumes:
  product-db-data:
  order-db-data:
```

Ports: **5432 → product** · **5433 → order** · **9092 → Kafka**. Main idea: each service talks only to *its* database, so it cannot accidentally touch the other service's tables.

```bash
docker compose up -d          # starts kafka, product-db, order-db
```

---

## 4. Prisma — two schemas, two databases, two clients

The monorepo keeps **one `schema.prisma` per service** (next to each app) so each service can evolve its schema independently — that *is* the "database per service" pattern.

| File | Models | Database |
|---|---|---|
| `apps/product-service/prisma/schema.prisma` | `Product`, `OutboxEvent` | `product` (5432) |
| `apps/order-service/prisma/schema.prisma` | `Order`, `ProductCopy` | `order` (5433) |

### 4a. `apps/product-service/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/@prisma/product-client"
}

datasource db {
  provider = "postgresql"
  url      = env("PRODUCT_DATABASE_URL")
}

model Product {
  id        Int      @id @default(autoincrement())
  name      String
  price     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OutboxEvent {
  id          Int       @id @default(autoincrement())
  eventType   String
  payload     Json
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())
  processedAt DateTime?

  @@index([status, createdAt])
}
```

### 4b. `apps/order-service/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/@prisma/order-client"
}

datasource db {
  provider = "postgresql"
  url      = env("ORDER_DATABASE_URL")
}

model Order {
  id        Int      @id @default(autoincrement())
  productId Int
  createdAt DateTime @default(now())
}

model ProductCopy {
  id        Int      @id @default(autoincrement())
  productId Int      @unique          // one copy per product
  name      String
  price     Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 4c. Reading the `output` path

`../../../` is relative to the schema's folder `apps/<svc>/prisma/`:

```
apps/<svc>/prisma/schema.prisma
   ../..         → apps/
   ../../../      → repo root
   → /node_modules/@prisma/<svc>-client
```

The client is generated *into* `node_modules` so that Nest's rspack build treats it as an **external dependency** (see §5 — this is the critical bit).

### 4d. Migrations

Run against each database's URL. `migrate dev` both creates the DB tables *and* regenerates the client:

```bash
# product database
PRODUCT_DATABASE_URL="postgresql://product:product@localhost:5432/product?schema=public" \
  npx prisma migrate dev --name init --schema apps/product-service/prisma/schema.prisma

# order database
ORDER_DATABASE_URL="postgresql://order:order@localhost:5433/order?schema=public" \
  npx prisma migrate dev --name init --schema apps/order-service/prisma/schema.prisma
```

Generated migration files:

- `apps/product-service/prisma/migrations/20260916100230_init/migration.sql` → creates `Product`, `OutboxEvent` (+ index `OutboxEvent_status_createdAt_idx`).
- `apps/order-service/prisma/migrations/20260916100240_init/migration.sql` → creates `Order`, `ProductCopy` (+ unique index `ProductCopy_productId_key`).

### 4e. ⚠️ Post-generation step: mark the client as CommonJS

The generated `package.json` has **no `"type"` field**, so it inherits the repo root's `"type": "module"`. The generated JS is CommonJS and must be loaded as CJS. After **every** `prisma generate`, run:

```bash
# apply to both clients after generate
node -e "const fs=require('fs');
for (const c of ['product-client','order-client']) {
  const p='node_modules/@prisma/'+c+'/package.json';
  const j=JSON.parse(fs.readFileSync(p,'utf8')); j.type='commonjs';
  fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
}"
```

(`prisma generate` regenerates `package.json` and drops this field, so re-apply it whenever you regenerate.)

### 4f. Generated output

```
node_modules/@prisma/product-client/   ← gitignored (inside node_modules)
node_modules/@prisma/order-client/     ← gitignored
```

The old plan tried generating into `apps/<svc>/generated/prisma` and importing via relative path — **do not do that** (see §5 for why it fails).

`.gitignore` addition (only relevant if you ever go back to `apps/<svc>/generated`):

```gitignore
# generated Prisma clients
/apps/*/generated
```

---

## 5. ⚠️ The big gotcha: `ERR_AMBIGUOUS_MODULE_SYNTAX` (and how it was solved)

**Symptom:** both services compiled fine (rspack: "compiled successfully in 16 ms") but crashed **at runtime** with:

```
ReferenceError: Cannot determine intended module format because both require() and top-level await are present.
code: 'ERR_AMBIGUOUS_MODULE_SYNTAX'
```

**Root cause chain:**

1. This repo's root `package.json` has `"type": "module"`, so Nest's rspack builder emits a **single ESM bundle** (`dist/apps/*/main.js`) containing `import` statements + top-level `await bootstrap()`.
2. Node 24's module-format detection runs even for files under an explicit `"type": "module"`. If the bundle text contains **both** ESM markers (`import`, top-level `await`) **and** CommonJS markers (`module.exports`, `exports.…`, `require(…`), it throws `ERR_AMBIGUOUS_MODULE_SYNTAX`.
3. Bundling the (CommonJS) Prisma client into the ESM bundle dragged `module.exports` / `exports.PrismaClient` / `require("node:process")` literals into `main.js` → exactly that ambiguity.

**Fix — keep Prisma clients OUT of the bundle (externalize them):**

- Generate each client into `node_modules/@prisma/<svc>-client` (§4). Bare specifiers (`@prisma/product-client`) resolved from `node_modules` are **externalized** by Nest's rspack config (`webpack-node-externals`), so the bundle contains a clean `import { PrismaClient } from "@prisma/product-client"` and **no** Prisma internals.
- Import with the bare specifier in the app code, **not** a relative path into the generated folder.
- Mark the generated package as CommonJS (§4e) so Node loads its `.js` files as CJS at runtime.

**After changing anything in the Prisma generated output, always clear the rspack cache** — a stale `node_modules/.cache` mask makes rspack reuse a bundle built against the old generated location:

```bash
rm -rf node_modules/.cache dist
```

(Tried-and-rejected alternatives, for the record: `moduleFormat = "esm"` is ignored by the `prisma-client-js` generator; a repo-level `rspack.config.js` externals override fights Nest's defaults; per-app `apps/*/generated` folders get bundled and hit the same ambiguity.)

---

## 6. Code added or modified

### 6a. `apps/product-service/src/prisma.service.ts` (NEW)

```ts
import {Injectable, OnModuleInit, OnModuleDestroy} from '@nestjs/common';
import {PrismaClient} from '@prisma/product-client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({datasources: {db: {url: process.env.PRODUCT_DATABASE_URL || 'postgresql://product:product@localhost:5432/product'}}});
    }
    async onModuleInit()    { await this.$connect(); }
    async onModuleDestroy() { await this.$disconnect(); }
}
```

### 6b. `apps/product-service/src/product-service.service.ts` (REWRITTEN — was an in-memory array)

The outbox write happens **in the same transaction** as the product insert:

```ts
async create(data: {name: string; price: number}) {
    return this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({data});
        await tx.outboxEvent.create({
            data: {eventType: 'product.created', payload: product},
        });
        return product;
    });
}
async findOne(id: number) { return this.prisma.product.findUnique({where: {id}}); }
async findAll()           { return this.prisma.product.findMany(); }
```

### 6c. `apps/product-service/src/outbox-relay.service.ts` (NEW)

Polls `OutboxEvent WHERE status='PENDING'` every 2s; for each row emits to Kafka (topic = `eventType`) then marks `PROCESSED`. Uses the `KAFKA_SERVICE` client injected from `ClientsModule`:

```ts
async onModuleInit() {
    await this.kafkaClient.connect();
    this.interval = setInterval(() => this.relay(), 2000);
    this.interval.unref();
    this.logger.log('Outbox relay started (2s interval)');
}
async relay() {
    const events = await this.prisma.outboxEvent.findMany({
        where: {status: 'PENDING'}, orderBy: {createdAt: 'asc'}, take: 10,
    });
    for (const event of events) {
        await this.kafkaClient.emit(event.eventType, event.payload);
        await this.prisma.outboxEvent.update({
            where: {id: event.id},
            data: {status: 'PROCESSED', processedAt: new Date()},
        });
    }
}
```

### 6d. `apps/product-service/src/product-service.controller.ts` (REWRITTEN — DB-backed)

```ts
@Controller('products')
export class ProductServiceController {
    constructor(private readonly productServiceService: ProductServiceService) {}

    @Post()
    async create(@Body() body: {name: string; price: number}) {
        return this.productServiceService.create(body);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.productServiceService.findOne(Number(id)); // route params are strings → Number()
    }
}
```

### 6e. `apps/product-service/src/product-grpc.controller.ts` (REWRITTEN — DB-backed gRPC)

```ts
@GrpcMethod('ProductService', 'GetProduct')
async getProduct(data: {id: number}) {
    const product = await this.prisma.product.findUnique({where: {id: data.id}});
    return product ?? {id: data.id, name: 'NOT FOUND', price: 0};
}
```

### 6f. `apps/product-service/src/product-service.module.ts` (MODIFIED)

Added `PrismaService` + `OutboxRelayService` to `providers` and registered the Kafka producer client:

```ts
imports: [
  ClientsModule.register([
    {
      name: 'KAFKA_SERVICE',
      transport: Transport.KAFKA,
      options: {
        client: {brokers: ['localhost:9092'], clientId: 'product-service', allowAutoTopicCreation: true},
        producer: {allowAutoTopicCreation: true},
      },
    },
  ]),
],
controllers: [ProductServiceController, ProductGrpcController, OrderEventListener],
providers: [ProductServiceService, PrismaService, OutboxRelayService],
```

### 6g. `apps/order-service/src/prisma.service.ts` (NEW — identical to product's, but `@prisma/order-client` + `ORDER_DATABASE_URL` + fallback `postgresql://order:order@localhost:5433/order`)

### 6h. `apps/order-service/src/product-created-listener.ts` (NEW)

Consumes `product.created` and upserts the read-model copy:

```ts
@Controller()
export class ProductCreatedListener {
    @EventPattern('product.created')
    async handleProductCreated(product: {id: number; name: string; price: number}) {
        await this.prisma.productCopy.upsert({
            where: {productId: product.id},
            create: {productId: product.id, name: product.name, price: product.price},
            update: {name: product.name, price: product.price},
        });
        this.logger.log(`Product copy synced: ${JSON.stringify(product)}`);
    }
}
```

### 6i. `apps/order-service/src/order-service.controller.ts` (MODIFIED — DB-backed)

```ts
@Post()
async createOrder(@Body() body: {productId: number}) {
    const order = await this.prisma.order.create({data: {productId: body.productId}});
    this.orderEventProducer.publishOrderCreated({orderId: order.id, productId: order.productId});
    return order;
}

@Get('grpc/:id')                                    // unchanged gRPC fallback
getOrderGrpc(@Param('id') id: string) {
    return this.productService.getProduct({id: Number(id)});
}

@Get(':id')
async getOrder(@Param('id') id: string) {
    const order = await this.prisma.order.findUnique({where: {id: Number(id)}});
    if (!order) return {error: 'Order not found'};
    const productCopy = await this.prisma.productCopy.findUnique({where: {productId: order.productId}});
    return {order, product: productCopy};
}
```

### 6j. `apps/order-service/src/order-service.module.ts` (MODIFIED)

Added `PrismaService` to `providers`, `ProductCreatedListener` to `controllers`, and a `KAFKA_SERVICE` producer client to `imports` (same shape as product-service's).

### 6k. `apps/order-service/src/main.ts` (MODIFIED — hybrid HTTP + Kafka consumer)

```ts
const app = await NestFactory.create(OrderServiceModule);
app.enableShutdownHooks();
app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
        client: {brokers: ['localhost:9092'], clientId: 'order-service', allowAutoTopicCreation: true},
        consumer: {groupId: 'order-service-group', allowAutoTopicCreation: true},
    },
});
await app.startAllMicroservices();
await app.listen(process.env.port ?? 3001);
```

(`product-service`'s `main.ts` is already hybrid from the previous Kafka lesson.)

---

## 7. Build, run and verify

```bash
# 1) infra up
docker compose up -d

# 2) generate clients (if fresh checkout — see §4e afterwards for the type:commonjs patch)
#    then clear cache and build
rm -rf node_modules/.cache dist
npx nest build product-service
npx nest build order-service

# 3) run (one watcher per service, never two — EADDRINUSE)
npx nest start product-service      # HTTP 3000
npx nest start order-service        # HTTP 3001
```

### Verified end-to-end run (this session)

```
POST /products {"name":"MacBook Pro 14","price":1999.99}
→ {"id":1,"name":"MacBook Pro 14","price":1999.99, ...}          [product-db]

product-service log:  OutboxRelayService  Relayed product.created event (id=1)
order-service log:    ProductCreatedListener  Product copy synced: {"id":1,...}

POST /orders {"productId":1}
→ {"id":1,"productId":1,"createdAt":...}                          [order-db]

GET /products/1
→ {"id":1,"name":"MacBook Pro 14","price":1999.99,...}

GET /orders/1
→ {"order":{"id":1,...},"product":{"id":1,"name":"MacBook Pro 14","price":1999.99,...}}   ← served from order-db ProductCopy

GET /orders/grpc/1
→ {"id":1,"name":"MacBook Pro 14","price":1999.99}               ← still works via gRPC
```

Database spot-checks:

```bash
docker exec product-db psql -U product -d product -c 'SELECT id,"eventType",status FROM "OutboxEvent";'
#  id |    eventType    |  status
#  1  | product.created | PROCESSED        ← relay marked it processed

docker exec order-db psql -U order -d order -c 'SELECT "productId",name,price FROM "ProductCopy";'
#  productId |      name      |  price
#           1 | MacBook Pro 14 | 1999.99
```

---

## 8. Rolling back to the pre-database state

The previous lesson was committed as `0289827` ("feat: Kafka producer/consumer + hybrid app + shutdown hooks + docker-compose"). To discard **all** database logic and return to that state:

```bash
git reset --hard 0289827
```

This deletes the working-tree changes for every tracked file from §6, the `docker-compose.yml` DB services, and the Prisma deps in `package.json`/`package-lock.json`. Untracked files (like this README's superseded content or the per-app `prisma/` folders listed by `git status --short` as `??`) survive a `git reset --hard`.

To re-apply the lesson from a clean checkout, follow §2 → §3 → §4 → §6 → §7 in order.

---

## Notes for this session's troubleshooting

- **Port 5001 EADDRINUSE** (previous lesson): caused by two simultaneous `nest start --watch` (WebStorm + terminal). Keep one watcher per service; `app.enableShutdownHooks()` is in both `main.ts`.
- **Kafka `This server does not host this topic-partition`**: transient race on topic auto-creation on first boot; the consumer re-joins and it resolves (worst case, wait a few seconds or restart the service).
- **`TimeoutNegativeWarning` from kafkajs**: harmless.