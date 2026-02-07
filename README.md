# Task Management API

A production-oriented, microservices-based task management system built with FastAPI, React, and PostgreSQL. Designed with clean architecture, scalability, and observability as core principles.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Network (8 Containers)               │
│                                                                 │
│   Browser ──► Nginx Gateway (:80)                               │
│                    │                                            │
│         ┌─────────┼──────────────────┐                          │
│         │         │                  │                          │
│         ▼         ▼                  ▼                          │
│   ┌──────────┐ ┌──────────┐ ┌──────────────┐                   │
│   │   Auth   │ │   Task   │ │    Audit     │                   │
│   │ Service  │ │ Service  │ │   Service    │                   │
│   │  :8001   │ │  :8002   │ │    :8003     │                   │
│   └────┬─────┘ └──┬───┬───┘ └──┬──────────┘                   │
│        │          │   │        │                               │
│        │          │   │ XADD   │ XREADGROUP                    │
│        │          │   └──►┌────┴───┐                           │
│        │          │       │ Redis  │ Event Bus (Streams)       │
│        │          │       │ :6379  │                           │
│        │          │       └────────┘                           │
│        ▼          ▼                                            │
│   ┌──────────────────┐    ┌──────────┐                         │
│   │   PostgreSQL     │    │  Jaeger  │ Distributed Tracing    │
│   │   :5432          │    │  :16686  │ (OpenTelemetry)        │
│   │ auth_db│task_db  │    └──────────┘                         │
│   │ audit_db         │                                         │
│   └──────────────────┘    ┌──────────┐                         │
│                           │ Frontend │ React + Ant Design      │
│                           │  :5173   │                         │
│                           └──────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Microservices (3 backend services) | Independent scaling, deployment, and team ownership. Each service owns its data and business logic. |
| **API Gateway** | Nginx reverse proxy | Routes requests to correct service by URL path. Mirrors Kubernetes Ingress pattern for cloud migration. |
| **Inter-service communication** | Redis Streams (not Pub/Sub) | Persistent messages with consumer groups, acknowledgment (XACK), and replay capability. Kafka-like semantics without the operational overhead. |
| **Database per service** | Separate PostgreSQL databases | Data isolation prevents cross-service coupling. Each service can evolve its schema independently. |
| **Authentication** | JWT (HS256) with shared secret | Pragmatic for internal services. Each service validates tokens independently without calling auth-service. See "Production Upgrades" for RS256 migration path. |
| **Password hashing** | Argon2id (via passlib) | OWASP-recommended algorithm, more secure than bcrypt. |
| **Observability** | OpenTelemetry + Jaeger v2 | Industry-standard distributed tracing. Request traces flow across all services, visible in Jaeger UI. |
| **Logging** | structlog (JSON) | Structured, machine-parseable logs ready for ELK/Loki ingestion. |
| **Frontend state** | TanStack Query (React Query) | Server state caching, automatic revalidation, optimistic updates. No Redux needed. |
| **UI framework** | Ant Design 5 | Rich component library (Table, Form, Modal, Timeline) accelerates development while maintaining consistency. |

### API Design

All endpoints are versioned under `/api/v1/` for forward compatibility.

#### Auth Service (`/api/v1/auth/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create account (returns JWT tokens) |
| POST | `/login` | Authenticate (returns JWT tokens) |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Current user profile |

#### Task Service (`/api/v1/tasks/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List tasks (filtered, paginated, sorted) |
| POST | `/` | Create task |
| GET | `/{id}` | Get task details |
| PUT | `/{id}` | Update task |
| PATCH | `/{id}/status` | Transition task status (validated) |
| DELETE | `/{id}` | Delete task |

**Query Parameters:** `status`, `priority`, `search`, `page`, `page_size`, `sort_by`, `sort_order`

#### Audit Service (`/api/v1/audit/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List audit logs (filtered, paginated) |
| GET | `/tasks/{task_id}` | Audit trail for a specific task |

### Task Status State Machine

```
TODO ──────────► IN_PROGRESS ──────────► DONE
 │                    │
 │                    ├──► BLOCKED ──► IN_PROGRESS
 │                    │
 └──► CANCELLED ◄────┘
```

Invalid transitions return `422 Unprocessable Entity` with a message listing allowed transitions.

### Event-Driven Audit Trail (Redis Streams)

```
Task Service                    Redis Streams              Audit Service
     │                               │                          │
     │  XADD task.events {           │                          │
     │    event: "task.created",     │                          │
     │    task_id, user_id, data     │                          │
     │  }                            │                          │
     │──────────────────────────────►│                          │
     │                               │  XREADGROUP + XACK      │
     │                               │◄─────────────────────────│
     │                               │─────────────────────────►│
     │                               │                          │ INSERT audit_log
```

Events: `task.created`, `task.updated`, `task.status_changed`, `task.deleted`

If the audit service is temporarily down, messages persist in Redis Streams and are processed when it recovers. No events are lost.

## Running Locally

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (or [Colima](https://github.com/abiosoft/colima) for macOS)
- That's it. Everything runs in containers.

### Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> && cd task-management-api

# 2. Copy environment variables
cp .env.example .env

# 3. Start all 8 containers
docker compose up -d --build

# 4. Open the app
open http://localhost          # Frontend
open http://localhost:16686    # Jaeger tracing UI
```

### Using Colima (macOS)

```bash
# Start Colima (Docker-compatible runtime)
colima start --cpu 4 --memory 4

# Then run docker compose as usual
docker compose up -d --build
```

### Makefile Commands

```bash
make up          # Start all services
make up-build    # Start with rebuild
make down        # Stop all services
make logs        # View all logs
make logs-task-service  # View specific service logs
make ps          # Show running containers
make clean       # Stop and remove volumes
make jaeger      # Open Jaeger UI
```

### Verify Services Are Running

```bash
# Health checks
curl http://localhost/api/v1/health

# API documentation (auto-generated by FastAPI)
open http://localhost:8001/docs  # Auth Service
open http://localhost:8002/docs  # Task Service
open http://localhost:8003/docs  # Audit Service
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET_KEY` | `dev-secret-...` | JWT signing secret (change in production!) |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `POSTGRES_USER` | `taskman` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `taskman_secret` | PostgreSQL password |

See `.env.example` for the complete list.

## Tech Stack

### Backend (per service)
- **Python 3.12** + **FastAPI** - Async REST framework with auto-generated OpenAPI docs
- **SQLAlchemy 2.0** - Async ORM with type-safe `Mapped[]` columns
- **Pydantic v2** - Request/response validation with Rust-powered core
- **asyncpg** - High-performance async PostgreSQL driver
- **redis-py** - Async Redis client with Streams support
- **structlog** - Structured JSON logging
- **OpenTelemetry** - Distributed tracing with OTLP export
- **Argon2** - OWASP-recommended password hashing
- **python-jose** - JWT token handling

### Frontend
- **React 19** + **TypeScript** - UI framework
- **Ant Design 5** - Enterprise-grade component library
- **TanStack Query 5** - Server state management
- **React Router 7** - Client-side routing with protected routes
- **Vite 6** - Fast build tool with HMR

### Infrastructure
- **PostgreSQL 16** - Relational database (separate DB per service)
- **Redis 7** - Event bus (Streams) + caching
- **Nginx** - API Gateway / reverse proxy
- **Jaeger v2** - Distributed tracing with OpenTelemetry
- **Docker Compose** - Container orchestration

## Assumptions

1. **Authentication is simplified**: JWT with shared HS256 secret across services. No email verification or password reset flows.
2. **Single-tenant**: No multi-tenancy. All users share the same task pool.
3. **No file uploads**: Task descriptions are text-only.
4. **In-memory table creation**: Using `Base.metadata.create_all()` for schema initialization. Production would use Alembic migrations exclusively.
5. **CORS open in dev**: All origins allowed for local development.

## What I Would Do Differently in Production

### Authentication & Security

Currently, all services share the same JWT secret (HS256). This is pragmatic for development but has a key weakness: every service that knows the secret can **create** tokens, not just verify them. If any service is compromised, the attacker can forge tokens for any user.

**Production upgrade: RS256 + JWKS**

```
Current (HS256 - shared secret):
  auth-service:  JWT_SECRET=abc123  ← signs AND verifies
  task-service:  JWT_SECRET=abc123  ← can also sign (risk!)
  audit-service: JWT_SECRET=abc123  ← can also sign (risk!)

Production (RS256 - asymmetric keys):
  auth-service:  Has PRIVATE key (only service that can SIGN tokens)
                 Exposes GET /.well-known/jwks.json → returns PUBLIC key

  task-service:  Fetches public key from JWKS endpoint, caches it
                 Can VERIFY tokens but CANNOT CREATE fake ones

  audit-service: Same — verify only, cannot forge tokens
```

JWKS (JSON Web Key Set) is a standard URL that returns public keys in JSON format. Every IAM platform (Keycloak, Zitadel, Auth0) provides this automatically. Key rotation becomes zero-downtime: publish a new key, old tokens remain valid until expiry.

**Additional security upgrades:**
- **OAuth2/OIDC via Zitadel**: Lightweight, cloud-native identity provider with native multi-tenancy, social login, MFA, and JWKS. Alternative: Keycloak if SAML or Active Directory integration is required.
- **Rate limiting**: Per-user and per-IP rate limits at the gateway level.
- **mTLS between services**: Using Cilium service mesh for zero-trust networking with eBPF-based identity enforcement (see Service Mesh section below).

### Infrastructure

- **Kubernetes**: Each service as a Deployment with HPA (auto-scaling). Helm charts for environment management.
- **K8s Ingress**: Replace Nginx container with Cilium Gateway API or Ingress Controller.
- **Database strategy**: Currently using one PostgreSQL instance with separate databases per service (`init-databases.sql` creates `auth_db`, `task_db`, `audit_db`). Data is isolated but shares one process. In production, migrate to managed instances (AWS RDS) per service only when independent scaling, backup schedules, or version requirements diverge.
- **Redis Cluster**: Replicated Redis for high availability. Current single-node Redis is sufficient for development.
- **NATS JetStream → Kafka**: Redis Streams is correct for current scale (<50K events/min, 1 consumer). Upgrade to NATS JetStream when needing disk-based persistence and event replay, or to Kafka for exactly-once delivery and millions of events/day.
- **Schema Registry**: Avro/Protobuf schemas for event contracts, ensuring producers and consumers agree on message format.

### Service Mesh: Cilium + Hubble

In production Kubernetes, services need encrypted communication, identity-based access control, and network observability. A service mesh provides this at the infrastructure layer so application code doesn't need to implement it.

**Why Cilium over Istio:**

| Feature | Cilium | Istio |
|---------|--------|-------|
| **Implementation** | eBPF (kernel-level) | Envoy sidecar proxies |
| **Performance** | Near-native (no proxy hop) | ~2-5ms latency per hop |
| **Resource overhead** | Low (no sidecars) | High (1 Envoy per pod) |
| **mTLS** | eBPF-accelerated | Envoy-based |
| **Observability** | Hubble (built-in flow visibility) | Kiali + Jaeger |
| **Network policy** | L3/L4/L7 with eBPF | L4/L7 with Envoy |
| **CNCF status** | Graduated | Graduated |

**What Cilium provides:**
- **mTLS everywhere**: Encrypted service-to-service communication without sidecars. Auth-service → task-service traffic is encrypted and identity-verified at the kernel level.
- **Network policies**: "task-service can only talk to postgres and redis, not directly to audit-service." Enforced by eBPF, not application code.
- **Hubble**: Real-time network flow visualization. See which service called which, with latency and error rates. Complements Jaeger (application traces) with network-level observability.

### Observability

Current setup uses Jaeger for distributed tracing (one of three observability pillars). Production adds metrics and logging:

- **Grafana LGTM stack**: Loki (logs) + Grafana (dashboards) + Tempo (traces, replaces Jaeger) + Prometheus (metrics). All open source, runs on ~1.4GB RAM total.
- **OpenTelemetry Collector**: Vendor-agnostic telemetry pipeline between services and backends. Instrument once, export to any backend. Enables switching from Jaeger to Tempo without changing application code.
- **Alerting**: PagerDuty/OpsGenie integration for SLA-based alerts.
- **SLIs/SLOs**: Define service-level indicators (p99 latency, error rate) and objectives.

### Resilience
- **Circuit breakers**: Prevent cascade failures between services (e.g., if audit-service is down, task-service still works).
- **Retry with exponential backoff**: For inter-service and external API calls.
- **Dead letter queue**: For events that fail processing after retries. Currently, Redis Streams retries indefinitely via pending entries list (PEL).
- **Health checks with readiness/liveness probes**: K8s-native health monitoring.

### CI/CD
- **GitHub Actions**: Lint, test, build, push to container registry on every PR.
- **Trunk-based development**: Short-lived feature branches, continuous deployment.
- **Terraform**: Infrastructure as Code for AWS resources (EKS, RDS, ElastiCache).
- **Canary deployments**: Gradual rollout with automated rollback.

### Multi-Tenancy (SaaS Considerations)

Multi-tenancy allows one application to serve multiple customers (tenants) with complete data isolation. Company A's tasks are invisible to Company B, even though they share the same infrastructure.

**Implementation approaches (from simple to complex):**

| Approach | How it works | Pros | Cons |
|----------|-------------|------|------|
| **Row-level security** | Add `tenant_id` to every table, PostgreSQL RLS policies filter automatically | Cheapest, one DB | Complex policies, risk of data leaks if filter missed |
| **Schema-per-tenant** | Each tenant gets own PostgreSQL schema (`tenant_a.tasks`, `tenant_b.tasks`) | Good isolation, one DB instance | Schema migrations run N times, connection pooling complexity |
| **DB-per-tenant** | Each tenant gets own database | Strongest isolation | Expensive, operational overhead, connection management |

**Supporting infrastructure:**
- **Tenant-aware JWT**: Include `tenant_id` in token claims. Every API request carries tenant context.
- **Resource quotas**: Per-tenant limits on tasks, API calls, storage.
- **Data residency**: Tenant data in specific regions for compliance (GDPR).

For this assessment, the system is **single-tenant** by design. The row-level security approach is the typical first step when adding multi-tenancy.

## Project Structure

```
task-management-api/
├── services/
│   ├── auth-service/          # Authentication microservice
│   │   ├── app/
│   │   │   ├── main.py        # FastAPI app + lifespan
│   │   │   ├── config.py      # Pydantic Settings
│   │   │   ├── models.py      # User model (SQLAlchemy 2.0)
│   │   │   ├── schemas.py     # Pydantic request/response schemas
│   │   │   ├── service.py     # Business logic
│   │   │   ├── security.py    # JWT + Argon2 password hashing
│   │   │   ├── dependencies.py# FastAPI dependency injection
│   │   │   ├── database.py    # Async engine + session factory
│   │   │   ├── router.py      # API endpoints
│   │   │   └── telemetry.py   # OpenTelemetry setup
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── task-service/          # Task management microservice
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── models.py      # Task model with composite indexes
│   │   │   ├── schemas.py     # CRUD + filter + pagination schemas
│   │   │   ├── service.py     # CRUD + state machine + events
│   │   │   ├── enums.py       # TaskStatus, TaskPriority, transitions
│   │   │   ├── events.py      # Redis Streams publisher
│   │   │   ├── security.py    # JWT validation (no user DB)
│   │   │   ├── database.py
│   │   │   ├── router.py
│   │   │   └── telemetry.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── audit-service/         # Audit logging microservice
│       ├── app/
│       │   ├── main.py        # Starts Redis Streams consumer
│       │   ├── config.py
│       │   ├── models.py      # AuditLog model
│       │   ├── schemas.py
│       │   ├── consumer.py    # Redis Streams XREADGROUP consumer
│       │   ├── security.py
│       │   ├── database.py
│       │   ├── router.py
│       │   └── telemetry.py
│       ├── Dockerfile
│       └── requirements.txt
│
├── frontend/                  # React + Ant Design SPA
│   ├── src/
│   │   ├── App.tsx            # Router + providers
│   │   ├── api/               # API clients (fetch-based)
│   │   ├── hooks/             # useAuth context
│   │   ├── pages/             # Login, Register, Tasks
│   │   ├── components/        # TaskFormModal, StatusTransition, AuditDrawer
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Token storage
│   ├── Dockerfile
│   └── package.json
│
├── gateway/
│   └── nginx.conf             # API Gateway routing config
│
├── scripts/
│   └── init-databases.sql     # Creates 3 PostgreSQL databases
│
├── docker-compose.yml         # 8 containers, 1 command
├── .env.example               # Environment variables template
├── Makefile                   # Developer convenience commands
└── README.md                  # This file
```

## License

This project was built as a technical assessment. All code is original.
