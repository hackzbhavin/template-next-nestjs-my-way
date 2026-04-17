# template-next-nestjs-my-way

Reusable full-stack template. Clone this whenever starting a new project.

**Stack:** Next.js 16 · NestJS 11 · MySQL 8 · Redis 7 · BullMQ · Prometheus · Grafana · k6

---

## Structure

```
.
├── backend/                       # NestJS API — port 9002
│   ├── src/
│   │   ├── config/
│   │   │   ├── redis.config.ts    # Redis connection factory
│   │   │   └── typeorm.config.ts  # TypeORM config (reads .env)
│   │   ├── entities/
│   │   │   └── user.entity.ts     # Example entity — replace/add yours
│   │   ├── migrations/            # TypeORM migrations
│   │   ├── modules/
│   │   │   └── users/             # Example module (controller/service/repo/DTOs)
│   │   │       ├── dto/
│   │   │       ├── users.controller.ts
│   │   │       ├── users.service.ts
│   │   │       ├── users.repository.ts
│   │   │       └── users.module.ts
│   │   ├── shared/
│   │   │   ├── decorators/
│   │   │   │   ├── inject-redis.decorator.ts  # @InjectRedis()
│   │   │   │   └── serialize.decorator.ts
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── response.interceptor.ts
│   │   │   │   └── serialize.interceptor.ts
│   │   │   ├── middleware/
│   │   │   │   └── response-time.middleware.ts
│   │   │   └── redis.module.ts    # @Global() Redis provider
│   │   ├── app.module.ts
│   │   ├── data-source.ts         # TypeORM CLI datasource
│   │   └── main.ts
│   ├── Dockerfile                 # 2-stage build
│   └── .env                       # Gitignored — copy from root .env.example
│
├── frontend/                      # Next.js app — port 9001
│
├── k6/
│   └── load-test.js               # Load test (ramp / spike / soak)
│
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/           # Auto-wires Prometheus (no login needed)
│   │   └── dashboards/            # Dashboard file provider
│   └── dashboards/
│       └── app-overview.json      # 12-panel dashboard
│
├── prometheus.yml                 # Scrapes NestJS /metrics
├── docker-compose.yml             # All infra services — reads from .env
└── .env.example                   # Single source of all config values
```

---

## Start a new project from this template

```bash
# 1. Copy the repo
cp -r template-next-nestjs-my-way my-new-project
cd my-new-project

# 2. Set config (one file controls everything)
cp .env.example .env
# Edit .env — set DB_NAME, passwords, ports

# 3. Start infrastructure
docker compose up -d

# 4. Install deps + run migrations
cd backend
npm install
npm run migration:run

# 5. Start backend
npm run start:dev
```

| Service    | URL |
|------------|-----|
| Backend    | http://localhost:9002/api/v1 |
| Grafana    | http://localhost:3000 (admin / admin) |
| Prometheus | http://localhost:9090 |

---

## Adding a new feature module

Follow the pattern in [backend/src/modules/users/](backend/src/modules/users/):

```
src/modules/your-feature/
├── dto/
│   ├── create-your-feature.dto.ts
│   └── update-your-feature.dto.ts
├── your-feature.controller.ts
├── your-feature.service.ts
├── your-feature.repository.ts
└── your-feature.module.ts
```

Register in [backend/src/app.module.ts](backend/src/app.module.ts):
```ts
imports: [..., YourFeatureModule]
```

Add the entity to [backend/src/config/typeorm.config.ts](backend/src/config/typeorm.config.ts):
```ts
const entities = [User, YourEntity];
```

---

## Inject Redis anywhere

```ts
import { InjectRedis } from 'src/shared/decorators/inject-redis.decorator';
import Redis from 'ioredis';

@Injectable()
export class MyService {
  constructor(@InjectRedis() private readonly redis: Redis) {}
}
```

---

## Add a BullMQ queue

```ts
// 1. Register queue in your module
BullModule.registerQueue({ name: 'my-queue' })

// 2. Producer (service)
@InjectQueue('my-queue') private readonly queue: Queue

// 3. Worker (processor)
@Processor('my-queue')
export class MyProcessor extends WorkerHost {
  async process(job: Job) { ... }
}
```

---

## Migrations

```bash
cd backend

npm run migration:run          # apply pending
npm run migration:revert       # roll back last
npm run migration:generate -- src/migrations/AddSomeColumn
```

> Remove `migrations/` and set `synchronize: true` in `typeorm.config.ts` for quick prototypes.

---

## Load testing

```bash
# Streams metrics live into Grafana
k6 run -o experimental-prometheus-rw k6/load-test.js

k6 run -o experimental-prometheus-rw --env SCENARIO=spike k6/load-test.js
k6 run -o experimental-prometheus-rw --env SCENARIO=soak  k6/load-test.js
```

Open Grafana **App Overview** dashboard to watch in real time.

---

## Remove what you don't need

| Feature | What to remove |
|---------|---------------|
| No queue | Remove `BullMQ` from `app.module.ts`, `RedisModule`, `processors/` |
| No Redis | Remove `RedisModule`, `redis.config.ts`, Redis from `docker-compose.yml` |
| No migrations | Delete `migrations/`, set `synchronize: true` |
| No monitoring | Remove Prometheus + Grafana from `docker-compose.yml` |
| No frontend | Delete `frontend/` |

---

## Grafana Dashboard Panels

Pre-built **App Overview** dashboard includes:

| Panel | What it shows |
|-------|--------------|
| HTTP Request Rate | Requests/sec by route |
| HTTP Latency p95/p99 | Latency percentiles |
| HTTP Error Rate | 5xx rate |
| Node.js Heap | Used vs total heap |
| CPU Usage | Process CPU |
| Active Handles | Open handles/requests |
| k6 VUs | Virtual users during load test |
| k6 Latency p95/p99 | Load test latency |
| k6 Checks Passed | Pass rate gauge |
| k6 HTTP Errors | Failure gauge |
| Total Requests Served | Cumulative counter |
| Process Uptime | Uptime stat |

---

## Ports

| Service    | Port |
|------------|------|
| Backend    | 9002 |
| Frontend   | 9001 |
| MySQL      | 3306 |
| Redis      | 6379 |
| Prometheus | 9090 |
| Grafana    | 3000 |
