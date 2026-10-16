# SRH News — Turborepo Foundation (Step 1)

Monorepo for the SRH public website, admin dashboard, and NestJS API.

```
srh-news/
├── apps/
│   ├── web/             # Public SRH website (Next.js, :3000)
│   ├── admin/           # Admin dashboard (Next.js, :3001)
│   └── api/             # NestJS backend (:4000)
├── packages/
│   ├── contracts/       # Shared API types and schemas (zod)
│   └── config/          # Shared tooling configuration
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

- Node.js LTS (>=20, pinned via `.nvmrc` — currently 24)
- Git
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker (for local PostgreSQL)

## Quickstart

```bash
# 1. Install dependencies
pnpm install

# 2. Configure env
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
# Edit passwords/ports if needed

# 3. Start PostgreSQL
docker compose up -d db
docker compose logs -f db  # wait for "ready to accept connections"

# 4. Start all apps (Turborepo)
pnpm dev

# Or start individually:
pnpm dev:api     # http://localhost:4000/health
pnpm dev:web     # http://localhost:3000
pnpm dev:admin   # http://localhost:3001
```

## Health check

```bash
curl http://localhost:4000/health
# {"status":"ok","db":"up","timestamp":"..."}
curl http://localhost:4000/health/db
# {"status":"ok","db":"up",...} or 503 with {"status":"degraded",...}
```

API connects to PostgreSQL via `DATABASE_URL`. If DB is down, `/health`
still returns 200 with `db: "down"`; `/health/db` returns 503.

## Tooling

- TypeScript base config: `tsconfig.base.json` (re-exported by `@srh/config`)
- ESLint flat config: `eslint.config.mjs`
- Prettier: `.prettierrc`
- Shared contracts: `@srh/contracts` (import in API + frontends)
