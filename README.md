# SRH Xtra — Turborepo (Steps 1–5)

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

| Method  | Endpoint                             | Purpose                                                |
| ------- | ------------------------------------ | ------------------------------------------------------ |
| `GET`   | `/api/v1/health`                     | Health check (legacy `/health` kept)                   |
| `GET`   | `/api/v1/articles`                   | Public feed — published only                           |
| `GET`   | `/api/v1/articles/:slug`             | Published article — 404 otherwise                      |
| `POST`  | `/api/v1/admin/articles`             | Create a draft                                         |
| `PATCH` | `/api/v1/admin/articles/:id`         | Edit a draft / published story (`?quiet=1` = autosave) |
| `POST`  | `/api/v1/admin/articles/:id/submit`  | DRAFT → IN_REVIEW                                      |
| `POST`  | `/api/v1/admin/articles/:id/publish` | IN_REVIEW → PUBLISHED (editor/publisher/admin)         |
| `GET`   | `/api/v1/admin/articles`             | Admin list (all statuses)                              |

Every `/api/v1/admin/*` route requires the caller's own staff API credential:
`Authorization: Bearer <token>` (or `x-admin-token`). The API resolves the
actor from the token's stored hash — clients cannot choose whose roles apply.
Publishing additionally requires `editor`, `publisher`, or `admin` role —
enforced from DB-backed roles. All admin mutations write an
`article_revisions` snapshot and an `audit_logs` entry.

Issue or rotate a staff credential (printed once; only the hash is stored):

```bash
pnpm --filter @srh/api staff:token editor@srh.local
```

`ADMIN_API_TOKEN` is only a bootstrap credential for the seeded admin until
that account gets its own token.

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

| Screen         | Route            | What it does                                                                                                                                                                                                                                                                                             |
| -------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in        | `/login`         | Verifies the staff member's personal API token via `GET /api/v1/admin/me`, stores it for subsequent admin calls                                                                                                                                                                                          |
| Dashboard      | `/`              | Published/draft/in-review counters from `GET /api/v1/admin/stats` + recent actions from `GET /api/v1/admin/activity` — all live DB data                                                                                                                                                                  |
| Articles       | `/articles`      | Debounced search, status filter, pagination (10/page), edit links                                                                                                                                                                                                                                        |
| New article    | `/articles/new`  | Title, auto-slug, summary, category, featured image (URL or upload ≤5MB), Tiptap body, save-draft, sanitized preview                                                                                                                                                                                     |
| Edit + publish | `/articles/[id]` | Draft and published-story editing plus a publishing panel: readiness checklist, submit-for-review, role-gated publish; debounced autosave (quiet — the explicit Save records the revision), unsaved-changes guard, SEO panel with SERP preview, and published edits refresh the live site within seconds |
| Media          | `/media`         | Media library: upload, search, preview, copy URL, paginate; the editor's "Library…" button reuses any asset as the featured image                                                                                                                                                                        |

Staff workflow without touching the DB: sign in → New article → save draft →
preview → submit for review → publish (editors/publishers/admins only) →
edit published stories in place when they need correcting.

### Newsroom OS (2026 redesign)

The admin UI is now a small in-house design system: tokens and components in
`apps/admin/app/globals.css`, light + dark themes (system default, toggle in the
topbar or ⌘K, persisted in `localStorage`), Space Grotesk for display/numbers
and Inter for UI text (self-hosted via `next/font`), a dark sidebar with a
frosted sticky topbar, and SRH orange as the accent.

- **⌘K command palette**: jump to any screen, toggle theme, sign out, or
  search stories server-side (debounced) from anywhere.
- **Dashboard**: count-up stat cards (each links to its filtered article list),
  a live status pipeline bar, and the activity feed.
- **Articles**: status pills (deep-linkable via `?status=`), category filter,
  whitelisted sorting, a floating bulk-action bar, and dense rows with inline
  actions.
- **Editor**: two-column layout with a sticky action bar and rail (workflow,
  category, featured image, SEO); autosave/guard/revision behaviour unchanged.
- **Feedback**: toasts for upload/copy/error events, skeletons while loading,
  empty states, and an inline autosave indicator.

Everything documented below (workflow v2, autosave semantics, revision
compare/restore, media picker, SEO panel, bulk actions) and every e2e locator
is unchanged by the redesign.

### Editorial workflow v2

- **Archive / restore**: published stories can be archived (unpublished) from
  the list or the editor — the worker removes them from the public site within
  seconds and the story can be restored to draft later. Drafts and in-review
  stories can be archived too (discarded).
- **Scheduled publishing**: reviewers can pick a time and the worker publishes
  the story automatically (transactionally — revision + audit + outbox event).
  Schedules can be cancelled or published early ("Publish now").
- **Request changes**: a reviewer can send an in-review story back to the
  author with a note; the note shows on the draft and clears on resubmission.
- **Revision history**: every save/submit/publish records a snapshot; the
  article page lists versions, previews any of them inline, and restores one
  with a click (restores are append-only — they write a new revision).
- **Bulk actions**: tick any number of stories in the list and archive,
  restore, publish (role-gated), or re-categorize them in one request (max 50
  per call). Results are per-item — an ineligible story is reported as skipped
  and never blocks the rest of the batch. Every item still gets its own
  revision + audit row + outbox event.
- **List controls**: server-side sorting (title / created / published /
  updated, ascending or descending), status and category filters, and search.
- Dashboard counters now cover scheduled and archived stories, and the
  activity feed logs every workflow action.

New endpoints: `POST /api/v1/admin/articles/:id/archive|restore|request-changes|schedule|schedule/cancel`,
`POST /api/v1/admin/articles/bulk` (actions above with per-item results),
`GET /api/v1/admin/articles/:id/revisions` (+ `/:version`, `POST .../restore`),
`GET /api/v1/admin/media` (media library: paginated, searchable), and
`GET /api/v1/admin/stats` now returns `scheduled`/`archived` counts. The
list endpoint accepts `sort` (`updated|created|published|title`), `dir`
(`asc|desc`), and `categoryId` in addition to `status`/`search`.
`PATCH /api/v1/admin/articles/:id?quiet=1` is the autosave path: content is
persisted but no revision/audit/outbox row is written (the explicit Save
click records all three). Migration `005_editorial_extras` adds
`articles.seo_title` / `articles.seo_description` and mirrors both onto
`article_revisions` so diffs and restores cover them.

### Editor experience (autosave · media · SEO)

- **Autosave + dirty-guard**: the editor quietly persists changes 2.5s after
  the last keystroke (drafts and published stories alike) and shows
  Unsaved / Autosaving / Saved state next to the button. Navigating away with
  unsaved changes (in-app link or tab close/reload) asks first. Autosaves
  never spam revision history — only explicit saves, workflow actions, and
  restores do.
- **Media library**: `/media` browses every uploaded asset (search,
  pagination, copy URL, open); the editor's "Library…" button opens a picker
  modal to reuse an existing image as the featured image, and new uploads land
  in the same library.
- **SEO panel**: per-article meta title / meta description overrides with
  recommended-length counters and a live Google-style SERP preview showing
  the headline/summary fallbacks. The public metadata prefers the overrides.
- **Revision compare**: any revision can be diffed against the current
  content or another revision — block-level alignment plus inline word-level
  highlighting for changed titles, summaries, SEO fields, and body blocks.

New API endpoints backing it: `GET /api/v1/admin/me`, `/stats`, `/activity`,
`/categories`, `GET /api/v1/admin/articles/:id`, and `POST
/api/v1/admin/media` (featured-image upload, served at `/uploads/*`, recorded
in `media_assets`). Migration `002_article_cover` adds
`articles.cover_image_url`.

## Public website (Step 4)

Public site at `http://localhost:3000` (`apps/web`, Next.js App Router).
Server Components fetch published content; client components are limited to
behaviour that genuinely needs the browser — the mobile menu, the news
filters (search/category/sort), the motion controller (scroll reveals,
parallax, sticky-header state), the article reading-progress bar, the stat
count-up, and the floating back-to-top button.

| Page            | Route                | Notes                                                                                                                                                                                                                                                                                                                       |
| --------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage        | `/`                  | Breaking strip, featured story, latest grid, per-category sections, topic chips                                                                                                                                                                                                                                             |
| Article         | `/news/[slug]`       | Headline, author, timestamps, hero image, sanitized body, related stories, share row (WhatsApp/X/copy link/native share), JSON-LD, canonical + OG/Twitter metadata                                                                                                                                                          |
| News listing    | `/news`              | URL-driven search, category filter, newest/oldest sort, pagination                                                                                                                                                                                                                                                          |
| Squad / Matches | `/squad`, `/matches` | Full IPL 2026 roster with hero facts, captain feature, composition panel, URL-shareable search/filters (`?q=&role=&origin=`), `SportsTeam` JSON-LD, generated OG image, and a profile page per player (`/squad/[playerSlug]`) with feed-sourced career stats, `Person` JSON-LD and generated OG cards; `/matches` is a stub |

SEO: `metadataBase` + per-article canonical URLs, Open Graph/Twitter cards,
`NewsArticle` JSON-LD, `sitemap.xml` (published slugs, squad and player pages),
`robots.txt`. Per-article meta title/description overrides (set in the admin
SEO panel) take priority over the headline/summary fallbacks in `<title>`,
meta description, OG and Twitter cards.
Bodies are sanitized server-side with `sanitize-html` (jsdom-free, so static
prerendering works). ISR `revalidate = 60` keeps pages fast; publishing pushes
on-demand revalidation (worker → webhook, below), so new stories appear within
seconds. Design tokens: SRH orange `#f26522`, charcoal, white, neutrals —
mobile-first CSS, no framework.

```bash
# canonical origin for SEO links (defaults to http://localhost:3000)
NEXT_PUBLIC_SITE_URL=https://www.example.com pnpm --filter @srh/web build
```

### Motion & micro-interactions

The premium polish layer — deliberately CSS-first and progressively
enhanced, so it never costs readers content or speed:

- **Page transitions** — `app/template.tsx` re-mounts per route change and
  replays a short fade + rise (`.page-transition`).
- **Scroll reveals** — `components/Motion.tsx` hides `[data-reveal]`
  elements only while they sit below the viewport, then fades/slides them
  in via one IntersectionObserver (per-element stagger with
  `data-reveal-delay`). Route changes and roster re-renders are picked up
  through a MutationObserver, so client navigation stays animated too.
- **Parallax** — `[data-parallax="14"]` hero images drift a few pixels as
  they cross the viewport, O(visible) per frame from one rAF-throttled
  scroll listener; the overscan is CSS, the offset is a `--parallax-y`
  custom property.
- **Hover/press feedback** — card lift + image push-in, a sheen sweep on
  the featured hero and primary buttons, animated nav underlines (the
  current section stays underlined via `aria-current`), player-portrait
  zooms, press states on chips/buttons. Hover flourishes sit behind
  `@media (hover: hover)` so touch devices get taps, not stuck hovers.
- **Micro-interactions** — article reading-progress bar, scoreboard
  count-up on the player stat tiles, sticky header that compacts on scroll,
  a live-pulse dot on the breaking strip, and an accessible floating
  back-to-top button.
- **Safety rails** — with `prefers-reduced-motion: reduce` every effect
  switches off (no hiding, no parallax, no transitions); with JavaScript
  off/blocked nothing is ever hidden — reveals are progressive enhancement
  of server-rendered, fully crawlable HTML. Motion is limited to
  opacity/transform, and the header/footer/hero never wait on JS.

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
- **Published edits**: saving a published story commits an `article.updated`
  outbox event in the same transaction; the worker revalidates the same
  tags/paths, so copy and metadata refresh in seconds.
- **Workflow v2**: archiving a published story commits an `article.archived`
  event on that same path (readers lose the story within seconds, and restore
  brings it back as a draft); stories left `SCHEDULED` are published by the
  worker at the due time with the exact transaction shape of a manual publish
  (status flip + revision + audit + `article.published`), so nothing can
  half-publish.
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
`summary_large_image`; canonical URLs and `NewsArticle` JSON-LD stay in sync
with the article data, and `/sitemap.xml` is rendered per request from the
tag-cached feed, so it never serves stale slugs.

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

## Production deployment (self-hosted)

The supported deployment shape is Node.js processes behind a TLS-terminating
reverse proxy, PostgreSQL 16, and optional S3-compatible media storage. No
cloud provider is assumed.

### Lifecycle order

1. Back up PostgreSQL and verify the backup (`pnpm backup`; see below).
2. Apply migrations with the **previous** application version still running:
   `pnpm --filter @srh/api db:migrate`. Migrations are additive and tracked in
   `schema_migrations`; deploy the new API only after they succeed.
3. Start/replace the API, then the outbox worker, then the web and admin
   processes. The worker is a separate process with no HTTP port.
4. On shutdown, send `SIGTERM` and allow at least 30 seconds. The API closes
   its Postgres pool, and the worker stops between batches. Do not kill the
   worker while an event is `PROCESSING`; the lease recovery path will retry it.
5. Restart the worker after every API rebuild so it runs the new compiled
   bundle. A worker and API built from different commits is unsupported.

### Build and run

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm format:check
pnpm --filter @srh/api build
pnpm --filter @srh/api db:migrate
pnpm build                 # requires the API reachable at NEXT_PUBLIC_API_URL
REVALIDATE_SECRET=... pnpm --filter @srh/web start
pnpm --filter @srh/admin start
REVALIDATE_SECRET=... WEB_REVALIDATE_URL=https://www.example.com/api/revalidate pnpm worker
```

The public web build pre-renders ISR pages from the API, so the API must be
reachable at build time. The admin build does not need it, but the combined
`pnpm build` does. Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, and
`NEXT_PUBLIC_IMAGE_HOSTS` at build time; `NEXT_PUBLIC_*` values are inlined.

### Containers

`Dockerfile` has `api`, `worker`, `web`, and `admin` targets. API/worker images
use a pnpm-deployed production bundle and run as the unprivileged `node` user;
the frontend targets run the production Next server the same way. The API and
worker share an `UPLOADS_DIR` volume when `MEDIA_DRIVER=local`.

```bash
docker build --target api -t srh-api .
docker build --target worker -t srh-worker .
docker build --target web -t srh-web \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://www.example.com .
```

`docker-compose.production.yml` wires PostgreSQL, the migration job, API, and
worker. Frontends are opt-in (`--profile frontends`) because their image build
requires a reachable API at `NEXT_PUBLIC_API_URL`. Required production
secrets are `${...:?}` variables, not committed defaults. The published ports
bind to loopback; terminate TLS and expose only 80/443 at the proxy.

### Configuration and secrets

Use `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`, and
`apps/admin/.env.example` as the complete inventory. Production requires at
least:

- `DATABASE_URL` and strong `ADMIN_API_TOKEN` (the API refuses the dev default
  and an empty value when `NODE_ENV=production`).
- `REVALIDATE_SECRET` shared by the web app and worker (never the documented
  dev value in production).
- `CORS_ORIGINS` plus `NEXT_PUBLIC_SITE_URL`; no wildcard origins.
- `TRUST_PROXY` set to the exact hop count or trusted IP/subnet list when the
  API sits behind a proxy. Leave it empty for direct exposure; otherwise a
  client can spoof `X-Forwarded-For` and the throttler keys.
- Media settings: `UPLOADS_DIR` for local storage, or the S3 variables; keep
  the same driver and bucket on API and worker.
- Optional `ERROR_WEBHOOK_URL` for 5xx/worker alerts.

Generate credentials with `openssl rand -hex 32`. Store them in the platform's
secret manager, never in the image or repository. Rotate by issuing a new
staff token (`pnpm --filter @srh/api staff:token <email>`), updating the API
bootstrap `ADMIN_API_TOKEN`, or rotating `REVALIDATE_SECRET` in the web app and
worker together. After a suspected database credential leak, rotate the role,
update `DATABASE_URL`, restart API/worker, and revoke old staff tokens.

### Proxy, TLS, and rate limits

Terminate TLS at the proxy and forward `X-Forwarded-Proto` /
`X-Forwarded-For`; set `TRUST_PROXY` to match. Keep the API and Postgres
off the public interface. Application limits are:

- 200 requests/minute globally per client.
- 60 requests/minute on admin routes.
- 30 requests/minute on the signed-upload receiver; the legacy multipart
  endpoint also enforces field, part, nesting, array-index, MIME, and 5 MB
  file limits.
- Revalidation rejects invalid secrets after 30 attempts/minute per web
  process; valid worker calls are unaffected.

Add a proxy-level login/admin and revalidation limit as the outer control.
The app's limits are per process, so scale the proxy limit with the number of
replicas. There is no password login endpoint: admin sign-in verifies a
pre-issued staff bearer token via `GET /api/v1/admin/me`; token guessing is
already bounded by the admin throttle.

### Health, monitoring, and recovery

- API readiness: `GET /api/v1/health` (database + pipeline state);
  `/health/db` returns 503 when the database is down.
- Web/admin: HTTP 200 from `/` (the container health checks do this).
- Worker: `worker.lastHeartbeatAt` in the API health payload; alert when
  `stale` is true or outbox `failed`/`pending` grows.
- Run `pnpm uptime:check` from an external monitor and send API 5xx/worker
  alerts to `ERROR_WEBHOOK_URL`.
- Back up nightly with `pnpm backup`, retain according to policy, and run
  `pnpm restore:test` on a schedule to prove restores. Never restore over a
  live database without stopping API and worker first.
- Rollback requires the previous image/bundle plus a database backup. Schema
  migrations are additive, so old application code can run against the new
  schema for a short rollback window. Dependency rollback must use the
  previous lockfile/image; do not downgrade Next below 15.5.28 or Multer below
  2.4.0 without re-running the security audit.

### CI

`.github/workflows/ci.yml` runs frozen install, typecheck, lint, format check,
and a high/critical production audit on pull requests. A second job starts
PostgreSQL, migrates and builds the API, builds the Next apps, starts all four
processes, then runs Playwright, the security checks, and the rate-limit
probe. It uses only local test credentials/secrets and uploads Playwright
artifacts on failure.

## Security posture (hardened post-red-team)

- **Staff auth**: one personal API credential per staff member, stored only as
  a SHA-256 hash (`pnpm --filter @srh/api staff:token <email>`). The API
  resolves the actor from that credential; client-supplied identity headers are
  ignored. Production **refuses to boot** with the `dev-admin-token` bootstrap
  default — generate one with `openssl rand -hex 32`. Suspended accounts get
  403; publish needs `editor`/`publisher`/`admin`.
- **Rate limiting**: 200 req/min globally, 60 req/min on admin routes, 30
  req/min on signed uploads (429s beyond). The revalidation webhook additionally
  rejects repeated invalid secrets (valid worker calls are not counted).
- **Admin token storage**: the browser keeps the staff bearer token in
  `localStorage` and sends it as an `Authorization` header. CSP, server-side
  sanitization, and the absence of third-party scripts reduce XSS exposure, but
  any successful XSS can read the token. An HttpOnly/Secure cookie session is a
  planned hardening migration: it needs an API session-issuing endpoint, CSRF
  tokens, `SameSite`/CORS credentials, server-side expiry/revocation, and a
  logout endpoint. It was not partially implemented here; do not mix cookie and
  localStorage auth in one deployment. The migration order is: (1) add a
  server-side session table and `POST /auth/session` / `DELETE /auth/session`
  endpoints that accept the existing bearer token; (2) set an HttpOnly,
  Secure, `SameSite=Lax` cookie and return a CSRF token; (3) update CORS to
  allow credentials for only the admin origin; (4) make admin mutations require
  the CSRF token; (5) run bearer and cookie auth side by side for one release,
  then remove the localStorage path and its `Authorization` header.
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
- **Dependency audit**: Next.js 15.5.28 (October 2026 image-optimizer fix) and
  Multer 2.4.0. `pnpm audit --prod` has no critical/high findings. One accepted
  moderate remains: `CVE-2026-35515` / `GHSA-36xv-jgw5-4q75` in
  `@nestjs/core <=11.1.17`. It only affects `@Sse` messages whose `type`/`id`
  fields contain attacker-controlled newlines; this API has no SSE endpoints
  (no `@Sse` usage), so it is not reachable. The patch requires Nest 11, a
  separate major migration; the finding is not suppressed. Re-check it before
  any future SSE feature.

### Copy protection (deterrents — not DRM)

- **Text**: `user-select: none` site-wide (form fields exempt) plus a
  capture-phase JS layer (`components/ContentProtection.tsx`) that blocks
  context menu, copy/cut, dragging, selection, and the save/print/view-source
  shortcuts (Ctrl/Cmd + C/X/A/U/S/P, F12, Ctrl+Shift+I/J/C/K). Blocked copies
  show a toast instead of silently swallowing the keystroke. Print renders a
  notice only.
- **Images**: the same non-interactive treatment as text — `pointer-events`,
  `-webkit-user-drag`, `-webkit-touch-callout`, and `user-select` disable
  selection, drag ghosts, right-click saving, and long-press callouts; events
  fall through to the wrapping link so card/hero navigation is unaffected. No
  visible marks are added to media.
- **Hotlinking**: `/uploads/*` (API) and `/_next/image` (web) return 403 for
  cross-site embeds via Referer + `sec-fetch-site` checks; no-referer and
  same-origin requests pass. Extend with `CORS_ORIGINS` / `NEXT_PUBLIC_SITE_URL`
  (API) and `IMAGE_HOTLINK_ALLOWED_HOSTS` (web, inlined at build time).
- **Legal**: footer copyright line and `/terms` (copyright, permitted use,
  prohibited use, enforcement; `noindex`, linked in the footer).
- **Reality check**: this stops casual copy/paste, right-click saving, and
  embedding. DevTools, View Source, `curl`, screenshots, and JS-disabled
  browsing bypass all of it by design — treat it as friction, not enforcement.

Self-hosted note: Next 15's self-hosted `next start` serves `/_next/image`
through an early asset path where `middleware.ts` may not run. Behind nginx,
enforce the same policy at the proxy — which is more robust anyway:

```nginx
location ^~ /_next/image {
  valid_referers none blocked server_names *.yourdomain.com;
  if ($invalid_referer) { return 403; }
  proxy_pass http://127.0.0.1:3000;
}
```

## Testing & verification

| Command               | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm e2e`            | Playwright against the live stack. **Acceptance scenario (8 steps):** writer creates a draft → writer's publish is denied (403) → publisher publishes → homepage shows it → the URL renders correctly on mobile (menu, no overflow) → updating the story refreshes content + og/twitter/JSON-LD metadata → an archived story disappears from homepage, listing, sitemap and 404s → recovery from a killed worker (durable outbox PENDING → fresh worker delivers). Plus the pipeline contract (forward-only workflow, drafts invisible, republish rejected), webhook secret-gating, and the UI publish flow with a real signed-URL cover upload. Removes its `e2e-%` fixtures (and the writer/publisher test staff) in teardown. |
| `pnpm security:check` | Auth bypass, mass assignment, draft invisibility, writer-publish `403`, webhook secret, image-optimizer SSRF, security headers. Add `-- --rate-limit` for the 429 burst battery.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pnpm uptime:check`   | Health/DB, outbox, worker heartbeat, web pages, newest-article round-trip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm restore:test`   | Backup recoverability drill (restore into a scratch DB).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

E2E preconditions: Postgres up, API on `:4000` (built), **worker running**,
production web on `:3000` (`pnpm --filter @srh/web build && pnpm --filter @srh/web
start`), admin on `:3001`, and either Docker (`CONTAINER=srh-news-db`) or a
`PSQL_URL` pointing at the test database for fixture SQL. In CI the runner
installs `psql` and sets `PSQL_URL`. Production builds refuse the dev revalidation
secret, so export a non-default one for the web app, the worker, and the test
run (for example `export REVALIDATE_SECRET=e2e-revalidate-secret`). Browsers: a
cached Chromium is used; on a fresh machine run `pnpm --filter @srh/e2e exec
playwright install chromium`.
