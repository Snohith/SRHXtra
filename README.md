# SRH News — Turborepo (Steps 1–4)

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

# 3b. Run database migrations (creates tables + seeds roles/categories/admin)
pnpm --filter @srh/api db:migrate

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

## Database (Step 2)

Tables (see `apps/api/migrations/001_init.sql`): `users`, `roles`
(`admin`/`editor`/`writer`/`publisher`), `user_roles`, `articles`
(`DRAFT → IN_REVIEW → PUBLISHED`, forward-only), `categories`
(`news`, `match-reports`, `squad-updates`, `analysis`),
`article_revisions`, `media_assets`, `audit_logs`.

Migrations are plain SQL applied in order and tracked in
`schema_migrations`:

```bash
pnpm --filter @srh/api db:migrate
```

## API endpoints (Step 2)

| Method | Endpoint                              | Purpose                      |
| ------ | ------------------------------------- | ---------------------------- |
| `GET`  | `/api/v1/health`                      | Health check (legacy `/health` kept) |
| `GET`  | `/api/v1/articles`                    | Public feed — published only |
| `GET`  | `/api/v1/articles/:slug`              | Published article — 404 otherwise |
| `POST` | `/api/v1/admin/articles`              | Create a draft               |
| `PATCH`| `/api/v1/admin/articles/:id`          | Edit a draft (DRAFT only)    |
| `POST` | `/api/v1/admin/articles/:id/submit`   | DRAFT → IN_REVIEW            |
| `POST` | `/api/v1/admin/articles/:id/publish`  | IN_REVIEW → PUBLISHED (editor/publisher/admin) |
| `GET`  | `/api/v1/admin/articles`              | Admin list (all statuses)    |

Every `/api/v1/admin/*` route requires staff auth: `Authorization: Bearer
$ADMIN_API_TOKEN` (or `x-admin-token`), with actor from `x-admin-user-id`
(defaults to seeded `admin@srh.local`). Publishing additionally requires
`editor`, `publisher`, or `admin` role — enforced from DB-backed roles.
All admin mutations write an `article_revisions` snapshot and an
`audit_logs` entry.

```bash
T=$ADMIN_API_TOKEN
curl -X POST localhost:4000/api/v1/admin/articles \
  -H "Content-Type: application/json" -H "Authorization: Bearer $T" \
  -d '{"title":"SRH Retention Updates 2026","body":"...","categoryId":1}'
# → DRAFT; invisible on /api/v1/articles until submit + publish
```

## Admin dashboard (Step 3)

CMS at `http://localhost:3001` (`apps/admin`, Next.js + React Hook Form/Zod +
Tiptap; preview HTML sanitized with DOMPurify in the browser).

| Screen | Route | What it does |
| ------ | ----- | ------------ |
| Sign-in | `/login` | Verifies staff token + email/user-ID via `GET /api/v1/admin/me`, stores them for subsequent admin calls |
| Dashboard | `/` | Published/draft/in-review counters from `GET /api/v1/admin/stats` + recent actions from `GET /api/v1/admin/activity` — all live DB data |
| Articles | `/articles` | Debounced search, status filter, pagination (10/page), edit links |
| New article | `/articles/new` | Title, auto-slug, summary, category, featured image (URL or upload ≤5MB), Tiptap body, save-draft, sanitized preview |
| Edit + publish | `/articles/[id]` | Draft editing plus a publishing panel: readiness checklist, submit-for-review, role-gated publish; every action records a server-side revision |

Staff workflow without touching the DB: sign in → New article → save draft →
preview → submit for review → publish (editors/publishers/admins only).

New API endpoints backing it: `GET /api/v1/admin/me`, `/stats`, `/activity`,
`/categories`, `GET /api/v1/admin/articles/:id`, and `POST
/api/v1/admin/media` (featured-image upload, served at `/uploads/*`, recorded
in `media_assets`). Migration `002_article_cover` adds
`articles.cover_image_url`.

## Public website (Step 4)

Fan site at `http://localhost:3000` (`apps/web`, Next.js App Router).
Server Components fetch published content; client components exist only for
the mobile menu and the news filters (search/category/sort).

| Page | Route | Notes |
| ---- | ----- | ----- |
| Homepage | `/` | Breaking strip, featured story, latest grid, per-category sections, topic chips |
| Article | `/news/[slug]` | Headline, author, timestamps, hero image, sanitized body, related stories, JSON-LD, canonical + OG/Twitter metadata |
| News listing | `/news` | URL-driven search, category filter, newest/oldest sort, pagination |
| Squad / Matches | `/squad`, `/matches` | Nav + coming-soon stubs; structured data lands post-launch |

SEO: `metadataBase` + per-article canonical URLs, Open Graph/Twitter cards,
`NewsArticle` JSON-LD, `sitemap.xml` (published slugs), `robots.txt`.
Bodies are sanitized server-side with `sanitize-html` (jsdom-free, so static
prerendering works). ISR `revalidate = 60` keeps pages fast; newly published
stories appear within a minute (on-demand revalidation webhook is the
follow-up). Design tokens: SRH orange `#f26522`, charcoal, white, neutrals —
mobile-first CSS, no framework.

```bash
# canonical origin for SEO links (defaults to http://localhost:3000)
NEXT_PUBLIC_SITE_URL=https://www.example.com pnpm --filter @srh/web build
```

## Tooling

- TypeScript base config: `tsconfig.base.json` (re-exported by `@srh/config`)
- ESLint flat config: `eslint.config.mjs`
- Prettier: `.prettierrc`
- Shared contracts: `@srh/contracts` (import in API + frontends)
