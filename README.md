# SRH News — Turborepo (Steps 1–5)

Monorepo for the SRH public website, admin dashboard, NestJS API, and the
reliable publish → revalidate → readers pipeline.

```
srh-news/
├── apps/
│   ├── web/             # Public SRH website (Next.js, :3000)
│   ├── admin/           # Admin dashboard (Next.js, :3001)
│   ├── api/             # NestJS backend (:4000) + outbox worker
│   └── e2e/             # Playwright end-to-end tests
├── packages/
│   ├── contracts/       # Shared API types and schemas (zod)
│   └── config/          # Shared tooling configuration
├── scripts/             # Ops tooling: backup, restore drill, uptime, security
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

# 5. Start the outbox worker (separate terminal) — delivers publish events to
#    the web tier. It runs the compiled bundle, so build the API first.
pnpm --filter @srh/api build
pnpm worker       # restart this after rebuilding the API
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
prerendering works). ISR `revalidate = 60` keeps pages fast; publishing pushes
on-demand revalidation (worker → webhook, below), so new stories appear within
seconds. Design tokens: SRH orange `#f26522`, charcoal, white, neutrals —
mobile-first CSS, no framework.

```bash
# canonical origin for SEO links (defaults to http://localhost:3000)
NEXT_PUBLIC_SITE_URL=https://www.example.com pnpm --filter @srh/web build
```

## Publishing pipeline (Step 5)

"Editor publishes → API validates → Postgres commits → worker revalidates →
readers see it" — with no lost events and no long cache waits:

```
admin UI ──publish──▶ API: role check + IN_REVIEW guard (forward-only)
                         │
                         ▼  ONE Postgres transaction
              articles.status = PUBLISHED
              article_revisions snapshot + audit_logs entry
              outbox_events row (article.published, slug)   ← atomic with the above
                         │
                         ▼  outbox worker (pnpm worker, polls every 2s)
              claim via FOR UPDATE SKIP LOCKED
              POST /api/revalidate  (x-revalidate-secret)
                         │
                         ▼  web (idempotent)
              revalidateTag('articles' | 'article:<slug>')
              revalidatePath('/', '/news', '/news/<slug>', '/sitemap.xml')
```

- **Reliability**: at-least-once delivery; failures retry with backoff
  (10s → 20s → 40s → 80s … capped at 5m, 5 attempts) before the event is marked
  `FAILED` and an alert fires. Rows stuck in `PROCESSING` after a worker crash
  are recovered after 2 minutes. Publish never depends on the web tier being
  up — if it is down, events stay `PENDING` and are delivered on recovery
  (verified by stopping worker/web mid-flight and restarting).
- **Ops**: the worker is a plain Node process (`node apps/api/dist/worker.js`,
  via `pnpm worker`) with no HTTP port; it writes a heartbeat to
  `system_state`. **Restart it after rebuilding the API** (it runs the compiled
  bundle). `GET /api/v1/health` exposes the live snapshot: `outbox
  {pending,processing,failed,done}` and `worker {lastHeartbeatAt, stale}`.
- **Env**: `REVALIDATE_SECRET` (must match between web and worker),
  `WEB_REVALIDATE_URL`, `OUTBOX_POLL_MS` (default 2000), `ERROR_WEBHOOK_URL`.
  Full list: root + `apps/*/.env.example` files.

### Signed image uploads

Featured images no longer pass through a multipart POST:

1. admin calls `POST /api/v1/admin/media/sign` → short-lived ticket bound to a
   storage key, MIME type, size cap, and actor (10-minute expiry)
2. the browser `PUT`s the bytes — local driver: HMAC-signed
   `PUT /api/v1/media/put?token=…`; `s3` driver: SigV4 presigned upload
   straight to the bucket (implemented without the AWS SDK, cross-checked
   byte-for-byte against `@smithy/signature-v4`)
3. `POST /api/v1/admin/media/complete` verifies the object and records the
   `media_assets` row.

Tampered, replayed, or expired tickets are rejected (`401`/`400`); wrong
content types and oversize files fail with `400`/`413`. The admin upload button
already uses this flow; the legacy multipart endpoint remains for compatibility.

> **Verification note**: this dev environment could not pull a MinIO image
> (Docker Hub unreachable), so the S3 driver was verified against the official
> AWS signer instead of a live bucket. When enabling `MEDIA_DRIVER=s3`,
> configure bucket CORS to allow `PUT` from the admin origin.

### Generated OG images

Share cards are rendered server-side with `ImageResponse`: a site-wide
`/opengraph-image` plus a per-article `/news/<slug>/opengraph-image` that is
used automatically when a story has no cover photo. Twitter cards are
`summary_large_image`; canonical URLs, `NewsArticle` JSON-LD, and the
`/sitemap.xml` (revalidated on publish) stay in sync with the article data.

### Backups & recovery drill

```bash
pnpm backup        # docker exec pg_dump -Fc → ./backups + pg_restore --list integrity check
pnpm restore:test  # restores the newest dump into a scratch DB, compares table
                   # counts and content samples, then drops it
```

Custom-format dumps with `BACKUP_KEEP` retention (default 7; `BACKUP_DIR`
overridable). The drill has been run for real — 12 tables, row counts and
article samples matched, restore ≈135ms. Schedule `pnpm backup` (hourly) and
`pnpm restore:test` (weekly).

### Monitoring

- **Structured logs**: every API request logs one JSON line (method, path,
  status, duration, `reqId` — send `x-request-id` to correlate across
  services). Unhandled exceptions log stack traces and report through the alert
  webhook. The worker logs the same shape and alerts on crashes and permanent
  delivery failures.
- **Alerts**: set `ERROR_WEBHOOK_URL` (Slack-compatible) to receive API 5xx
  errors, worker failures, permanently `FAILED` outbox events, and
  `pnpm uptime:check` failures. Empty = log-only.
- **Uptime checks**: `pnpm uptime:check` verifies API health + DB, zero FAILED
  outbox events, a fresh worker heartbeat, web `/` and `/news` (200), and a
  full round-trip of the newest published article. Exits 1 on failure and
  optionally POSTs to a webhook — run it from cron (every 5 minutes) or your
  uptime service.

## Tooling

- TypeScript base config: `tsconfig.base.json` (re-exported by `@srh/config`)
- ESLint flat config: `eslint.config.mjs`
- Prettier: `.prettierrc`
- Shared contracts: `@srh/contracts` (import in API + frontends)

## Security posture (hardened post-red-team)

- **Staff auth**: `ADMIN_API_TOKEN` required on every `/api/v1/admin/*` call;
  production **refuses to boot** with the `dev-admin-token` default — generate
  with `openssl rand -hex 32`. Actor from `x-admin-user-id` (UUID or email);
  suspended accounts get 403; publish needs `editor`/`publisher`/`admin`.
- **Rate limiting**: 200 req/min globally, 60 req/min on admin routes (429s beyond).
- **CORS**: explicit allowlist (`localhost:3000/3001` + `CORS_ORIGINS`) — no wildcard.
- **SSRF**: `/_next/image` optimizer allowlists only the API host, site host, and
  `NEXT_PUBLIC_IMAGE_HOSTS` (arbitrary hosts → 400 without fetching).
- **Headers**: CSP, `X-Frame-Options: DENY`, nosniff, strict referrer policy,
  locked-down `Permissions-Policy`, HSTS; `X-Powered-By` disabled on API + web.
- **Data**: Postgres bound to `127.0.0.1`; article bodies sanitized server-side
  (`sanitize-html`) before rendering; uploads restricted to image MIME types ≤5MB;
  drafts return uniform 404s publicly; mass assignment rejected (400).
- **Signed uploads**: upload tickets are HMAC-signed and bound to key/MIME/size/
  actor with a 10-minute expiry — tampering, replay, and cross-type uploads are
  rejected (`401`/`400`). The revalidation webhook compares secrets in constant
  time and is rate limited.
- **Pipeline**: publishing is forward-only and transactional; an article only
  becomes publicly visible after the commit plus the (idempotent) revalidation,
  so nothing half-published can leak through caches.

## Testing & verification

| Command | What it proves |
| ------- | -------------- |
| `pnpm e2e` | Playwright against the live stack: the full editorial flow through the real UI (sign in → draft → **signed-URL cover upload** → submit → publish → readers see it within seconds), the API pipeline contract (forward-only workflow, drafts invisible publicly, republish rejected), and webhook secret-gating. Removes its `e2e-%` fixtures in teardown. |
| `pnpm security:check` | Auth bypass, mass assignment, draft invisibility, writer-publish `403`, webhook secret, image-optimizer SSRF, security headers. Add `-- --rate-limit` for the 429 burst battery. |
| `pnpm uptime:check` | Health/DB, outbox, worker heartbeat, web pages, newest-article round-trip. |
| `pnpm restore:test` | Backup recoverability drill (restore into a scratch DB). |

E2E preconditions: Postgres up, API on `:4000` (built), **worker running**,
production web on `:3000` (`pnpm --filter @srh/web build && pnpm --filter @srh/web
start`), admin on `:3001`, and Docker available for fixture cleanup
(`CONTAINER=srh-news-db`). Browsers: a cached Chromium is used; on a fresh
machine run `pnpm --filter @srh/e2e exec playwright install chromium`.
