# NestJS + Next.js Template

Reusable full-stack template. Clone this whenever starting a new project.

**Stack:** Next.js · NestJS 11 · MySQL 8 · Redis 7 · BullMQ · Prometheus · Grafana · cAdvisor · k6

---

## Quickstart

```bash
# 1. Copy the repo
cp -r template-next-nestjs-my-way my-new-project
cd my-new-project

# 2. Configure (one file controls everything)
cp .env.example .env
# Edit .env — set DB_NAME, passwords, ports as needed

# 3. Start all infrastructure
docker compose up -d

# 4. Run migrations
cd backend && npm install && npm run migration:run

# 5. Start backend in dev mode
npm run start:dev
```

| Service    | URL                                     |
|------------|-----------------------------------------|
| Backend    | http://localhost:9002/api/v1            |
| Grafana    | http://localhost:3000 (admin / admin)   |
| Prometheus | http://localhost:9090                   |
| cAdvisor   | http://localhost:8080                   |
| Frontend   | http://localhost:9001                   |

---

## Project Structure

```
.
├── backend/                        # NestJS API — port 9002
│   └── src/
│       ├── config/
│       │   ├── redis.config.ts     # Redis connection factory
│       │   └── typeorm.config.ts   # TypeORM config (reads .env)
│       ├── entities/
│       │   └── user.entity.ts      # Example entity — replace/add yours
│       ├── migrations/             # TypeORM migration files
│       ├── modules/
│       │   └── users/              # Example CRUD module
│       │       ├── dto/
│       │       ├── users.controller.ts
│       │       ├── users.service.ts
│       │       ├── users.repository.ts  ← MySQL metrics instrumented here
│       │       └── users.module.ts
│       └── shared/
│           ├── decorators/
│           │   └── inject-redis.decorator.ts   # @InjectRedis()
│           ├── filters/
│           │   └── http-exception.filter.ts
│           ├── interceptors/
│           │   ├── response.interceptor.ts     # Wraps all responses
│           │   └── serialize.interceptor.ts
│           ├── metrics/
│           │   └── metrics.module.ts           # All Prometheus metrics defined here
│           ├── middleware/
│           │   └── response-time.middleware.ts ← HTTP metrics instrumented here
│           └── redis.module.ts                 # Global Redis provider
│
├── frontend/                       # Next.js app — port 9001
│
├── k6/
│   └── load-test.js                # Load test: ramp / spike / soak scenarios
│
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/            # Auto-wires Prometheus datasource
│   │   └── dashboards/             # Dashboard file provider
│   └── dashboards/
│       └── app-overview.json       # Pre-built dashboard (see panels below)
│
├── prometheus.yml                  # Scrape config: NestJS + cAdvisor
├── docker-compose.yml              # All services — reads from .env
└── .env.example                    # Single source of all config values
```

---

## Adding a New Feature Module

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

### Adding MySQL metrics to a new repository

Inject the histogram and time your queries with `try/finally`:

```ts
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { METRIC_MYSQL_DURATION } from '../../shared/metrics/metrics.module.js';

@Injectable()
export class YourRepository {
  constructor(
    @InjectRepository(YourEntity) private readonly repo: Repository<YourEntity>,
    @InjectMetric(METRIC_MYSQL_DURATION) private readonly mysqlHistogram: Histogram<string>,
  ) {}

  async findAll() {
    const end = this.mysqlHistogram.startTimer({ operation: 'find_all' });
    try {
      return await this.repo.find();
    } finally {
      end();
    }
  }
}
```

### Adding Redis metrics

```ts
import { METRIC_REDIS_DURATION } from '../../shared/metrics/metrics.module.js';

const end = this.redisHistogram.startTimer({ operation: 'get' });
await this.redis.get(key);
end();
```

---

## Inject Redis Anywhere

```ts
import { InjectRedis } from 'src/shared/decorators/inject-redis.decorator';
import Redis from 'ioredis';

@Injectable()
export class MyService {
  constructor(@InjectRedis() private readonly redis: Redis) {}
}
```

---

## BullMQ Queue

```ts
// 1. Register queue in your module
BullModule.registerQueue({ name: 'my-queue' })

// 2. Producer (service)
@InjectQueue('my-queue') private readonly queue: Queue
await this.queue.add('job-name', payload);

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

npm run migration:run                                        # apply pending
npm run migration:revert                                     # roll back last
npm run migration:generate -- src/migrations/AddSomeColumn  # generate from entity diff
```

> For quick prototypes: delete `migrations/` and set `synchronize: true` in `typeorm.config.ts`.

---

## Load Testing

```bash
# Streams metrics live into Grafana
k6 run -o experimental-prometheus-rw k6/load-test.js

# Spike scenario
k6 run -o experimental-prometheus-rw --env SCENARIO=spike k6/load-test.js

# Soak test (30 min — catches memory leaks)
k6 run -o experimental-prometheus-rw --env SCENARIO=soak k6/load-test.js
```

Open Grafana → **App Overview** to watch in real time.

**Thresholds (fail the test if breached):**
- p95 < 200 ms, p99 < 500 ms
- Error rate < 1%

---

## Observability

All metrics are auto-collected. Nothing extra to configure — just `docker compose up`.

### Custom Metrics (defined in `shared/metrics/metrics.module.ts`)

| Metric | Type | Labels | What it measures |
|--------|------|--------|-----------------|
| `http_request_duration_seconds` | Histogram | method, route, status_code | End-to-end HTTP latency |
| `http_requests_total` | Counter | method, route, status_code | Request count by status |
| `http_requests_in_flight` | Gauge | — | Concurrent active requests |
| `mysql_operation_duration_seconds` | Histogram | operation | Per-query MySQL latency |
| `redis_operation_duration_seconds` | Histogram | operation | Per-command Redis latency |

Default Node.js metrics (CPU, heap, RSS, event loop lag, GC) are collected automatically by `prom-client`.

### Grafana Dashboard Panels

Open **App Overview** at http://localhost:3000:

| Section | Panels |
|---------|--------|
| k6 Load Test | VUs, request rate, p95/p99 latency, error rate gauge |
| NestJS HTTP | Request rate by status, p95/p99 per route, in-flight gauge |
| Node.js Internals | CPU, heap used/total, RSS memory, event loop lag |
| Container Memory | Usage vs 2 GB limit, memory % gauge (green/yellow/red), CPU, GC pauses |
| MySQL | p95/p99 latency per operation, ops/s |
| Redis | p95/p99 latency per operation, ops/s |
| Summary | Total requests, uptime, k6 checks passed, 5xx rate |

### What to watch during a load test

- **Memory % gauge** — approaches red (90%) → container near 2 GB limit, OOM risk
- **Event loop lag** — above 100 ms means Node.js thread is blocked
- **GC pauses** — frequent long pauses correlate with heap pressure
- **MySQL p99** — growing latency at high RPS = lock contention
- **In-flight requests** — sustained high value = slow downstream or too few connections

---

## Remove What You Don't Need

| Feature | What to remove |
|---------|----------------|
| No queue | Remove `BullMQ` from `app.module.ts`, `processors/` folders, `RedisModule` if unused |
| No Redis | Remove `RedisModule`, `redis.config.ts`, redis service from `docker-compose.yml` |
| No migrations | Delete `migrations/`, set `synchronize: true` in `typeorm.config.ts` |
| No monitoring | Remove prometheus, grafana, cadvisor from `docker-compose.yml` |
| No frontend | Delete `frontend/` |

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
| cAdvisor   | 8080 |
