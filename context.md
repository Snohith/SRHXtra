# Architecture blueprint: SRH-focused IPL news platform

If I were designing this as a senior engineer at a FAANG-level company, I would treat it as a team-specific sports media platform, not just a news blog.

The product should focus exclusively on Sunrisers Hyderabad (SRH): breaking news, match coverage, player profiles, tactical analysis, squad updates, statistics, and a strong fan experience. The architecture should also make publishing fast, protect the admin system, and support traffic spikes during live matches.

My recommendation: a modular monolith with a headless content architecture, server-rendered frontend, and a separate protected admin application. Start simple, but establish clear boundaries so you can scale without rewriting the entire product.

## 1. Recommended technology stack

[Making a custom 404 page in Next.js - DEV Community](https://images.openai.com/static-rsc-4/bLlalbNp6jrlR_MDbXrZboKQVewUYbl540tPaxrKHfeYhkUuIbcY24EuZwqdvoz2T6syE51AVhW2nzEAnbXMhFU1S9FS9hfRUHcmE0rqe4-MftFGYbc3hxELPbunRQ4RO1h7brQUYFBkCbuY4CGkHzzUDPnQR728ILI1Y17qp2M?purpose=inline)

Frontend — Next.js + TypeScript

Recommended

Server-side rendering, static generation, SEO-friendly article pages, fast navigation, and image optimization.

[Nestjs Original Wordmark PNG Logo — Download Free Transparent Logo](https://images.openai.com/static-rsc-4/RzTFD97ZTYCSrM4-ctEvslHt0ICbL5-Y3B5oY2J8xHxPuu1C53_DUd_nqhie6xkcqjsOJukWd7O9-eOjZHKeqjn4DGrz1ixzn8HQ3XAAlMqG0KdR9AfCFU9MZAS7iUpPlH3IRjDgnaL3IQeoPzOKbHanr7NkQhEMD2brUxxg1Gw?purpose=inline)

Backend — NestJS + TypeScript

A modular API for articles, users, editorial workflows, tags, match data, and administration.

[Homepage | DAO Systems Latino América](https://images.openai.com/static-rsc-4/S5rfUWpdahNrwuWj5WLrEglYfYQvGIihldTZtMXN3rhPAz_mzayK7AxRC9-_byOkD6dL65Y3EHx7iVS75PihiX34gaj0l8Dg2MOftoc5qTVT_Yie_nrO0ZAKPUEmmZ0hNjxtiqFUvnpqbHXBoJrQDmWvrpzzPSZUtb2UU8KpMPw?purpose=inline)

Database — PostgreSQL

Reliable relational data for articles, authors, categories, permissions, revisions, and match records.

[Amazon S3 Logo Vector File Free Download | Logowik](https://images.openai.com/static-rsc-4/yERg_TIo2qz3Q-fYJkaK75TyrFas1Wq5iH4apMy2in3HtFdmikR1_0sUTI1PQHYDyT13mf_pa1HMxxbc90VpfW7dq1cqZ65uJSf3akmxsjZimToNWQ5CZMKu5r4Xl50Sl7caKmWfINqlfofCS4YAE0NS56Oh5Zl7-hMW8vKHb58?purpose=inline)

Media — S3-compatible object storage + CDN

Store article covers, player photos you have permission to use, thumbnails, and editorial assets outside your application server.

[What are the pricing options for Redis?](https://images.openai.com/static-rsc-4/cxD0mNwOFZou3c4Llf54BhJRBatnwNaB1PRyLFmIPi8T_DppI8Tx5eXaldNM50YFgyAVtop1YVxSro1--SPQPyUwd84VpfhigqOETDMxnOrMCs17WGKsFDxEhnu6gcrlkKs6d9R4wQpKeQAR5180qRPJtYD1UoA32ydSYxE5k1U?purpose=inline)

Caching and jobs — Redis + background workers

Cache popular content, process image variants, schedule publications, and invalidate stale pages after an article changes.

| Layer           | Technology                                                         |
| --------------- | ------------------------------------------------------------------ |
| Public website  | Next.js App Router                                                 |
| Admin dashboard | Separate Next.js application                                       |
| UI and styling  | Tailwind CSS + accessible component primitives                     |
| API             | NestJS REST API with OpenAPI                                       |
| Data access     | Prisma ORM or Drizzle                                              |
| Validation      | Zod on the frontend; server-side DTO validation                    |
| Authentication  | Managed identity provider or secure server-side sessions           |
| Search          | PostgreSQL full-text search initially                              |
| Testing         | Vitest, Playwright, API integration tests                          |
| Deployment      | Managed frontend hosting + containerized API                       |
| Monitoring      | OpenTelemetry-compatible tracing, error reporting, structured logs |

Why this stack? You get a strong TypeScript ecosystem across the frontend and backend, good SEO for a content-heavy site, and a backend structure that is easy to test and maintain. You do not need microservices to achieve this.

## 2. High-level system architecture

Keep the public website and admin dashboard separate at the application level, while sharing the backend and core design conventions.

Visitors / SRH fans

Mobile · Desktop · Search engines

CDN + WAF + rate limiting

Static assets · DDoS protection · Request filtering

Public app

Next.js SSR/SSG

Home · News · Matches · Players

Admin app

Next.js + protected routes

Editor · Publisher · Media · Users

NestJS API / application layer

Auth · Articles · Editorial workflow · Search · Matches · Audit logs

PostgreSQL

Source of truth

Redis + workers

Cache and jobs

Object storage

Images and media

Optional external cricket data provider feeds the match-data module through a separate adapter.

One important distinction: hiding admin pages in the frontend is not security. Every admin API operation must independently enforce authentication, role permissions, and resource-level authorization.

## 3. Client-side architecture: public SRH website

Design the site around what a fan wants to know in the first five seconds: what happened, what is happening, and what is next.

[⚽️ Football News Website UI by Alla Yefimchuk on Dribbble](https://images.openai.com/static-rsc-4/DYgOw68mas0WLL3p_1svBFPb7ajc7nBD6gyMYfvlHqu3kN39YGo7-wKmC5CVhcCInylv8pqCXEr0WCUOBeh-QK1fEZCG-qkV91CFmFYiIOY57UchIQxx5iXJ5Hc0rQUl-eKRGOhhDwQxEAg0UQHaDQBNk8tp3gRx5GYz990_tcM?purpose=inline)

[News Website designs, themes, templates and downloadable graphic elements on Dribbble](https://images.openai.com/static-rsc-4/-QeaCtVvhK48vK5F7wlH_7UhmeQbalABZU7xdyQ20IUbLaa24jel8uUaKyc_7B7Exk6k_eghIEFYIGGMjePY_X1cZrGzVWaqw30IqC6zK9IwJX6UbZzQmWdqvBVlbIB5EXoPVrcxMTTIBWRkMGCGUG3lC9yJWNcmDj59ntNf4lc?purpose=inline)

[Player Profile Page of Cricket Website by Swarnim Tiwari on Dribbble](https://images.openai.com/static-rsc-4/QpplYWh0wGkgZv3TFgeaTg3hBLmag7FCJ9x42uQPqZp7GOuI1BSNes9qPp4jvzSsn0vgRGOLMyw8gV-terEqol3oLhsZOVqmihrCJEdjj2R-W4HJtq2SGYjExSsVavOuh3zVmQw8wG8iu-PF7cMSuqFcsrWx2f0xx86kAR1MxfY?purpose=inline)

9

### Suggested pages and navigation

Home — `/`

Breaking news ticker, featured story, latest articles, match countdown or latest result, trending stories, and recent analysis.

News — `/news`

Filter by transfers and auction, squad updates, injuries, press conferences, match reports, rumors, and official announcements. Label unconfirmed reporting clearly.

Matches — `/matches`

Upcoming fixtures, completed matches, scorecards, results, match previews, and post-match analysis.

Squad — `/squad`

Player profiles, roles, career information, season statistics, and availability updates with reliable sourcing.

Analysis — `/analysis`

Tactical breakdowns, player performance, match trends, opinion columns, and long-form editorial content.

Search — `/search?q=...`

Search headlines, article bodies, authors, players, and match reports.

### Article page architecture

Every article should have a stable, shareable URL such as:

`/news/srh-retention-updates-2026`

Include:

- Headline, summary, author, publication time, and last-updated time.
- Featured image with descriptive alt text and responsive sizes.
- Article body with headings, quotations, images, and embedded match information.
- Source attribution and clear distinction between confirmed news, reporting, and opinion.
- Related stories, tags, player links, and social sharing.
- Canonical URL, Open Graph metadata, structured data, and XML sitemap inclusion.

For SEO, use server-rendered or statically generated HTML for public content. Client-side JavaScript should enhance the experience rather than being required to reveal the article text.

### Frontend folder structure

```
apps/
  web/
    src/
      app/
        (public)/
          page.tsx
          news/
            page.tsx
            [slug]/page.tsx
          matches/
            page.tsx
            [matchId]/page.tsx
          squad/
            page.tsx
            [playerSlug]/page.tsx
          analysis/
            page.tsx
          search/page.tsx
        api/                 # Only if Next.js endpoints are needed
      components/
        layout/
        navigation/
        article/
        match/
        player/
        seo/
        ui/
      lib/
        api/
        seo/
        formatting/
      hooks/
      styles/
```

Use Server Components by default. Use Client Components only where interaction requires them—for example, filters, search controls, comment forms, and interactive scorecards.

Do not put every component behind `"use client"`. That increases JavaScript shipped to the browser and makes performance harder to control.

## 4. Admin architecture: the editorial control center

This is where I would invest most of the product engineering effort. A sports news site succeeds when editors can publish accurate news quickly, correct mistakes safely, and manage content without depending on a developer.

[On | The New Storytellers | Contentful](https://images.openai.com/static-rsc-4/Gv-Qb5iw4Y44J4I0LPGEEkMev_1qOR-Oa-ydiZFK65HqcanXBn5MYa7ZUbrkz4FBFriS0S8ilrK8N_d6TopvS4jKdbgmRzyrUzs-skjix2armx1G6xvzbTPJxBPCI_fOnuLQmFfjGVKuUuwkhQssgAXGtrn17AYpCoBLTn3sgSs?purpose=inline)

[Statamic — the answer to your frustrating CMS problems.](https://images.openai.com/static-rsc-4/xc3YphBb56aTeIFtTJVE5ZmHG38rYVM50h8c_7MOUHfu0dWii-CfJ4WfL59JvZJX4gBBvCynGfLjnkuNi6YM2Jc3VOLEYgY5PiIAVNW9TU7yfyXYwUkVPNBQty4ilu1qi7xJGsB_aMMAhmb4aKeLLA-caVz3Xve_YKewW_0wAiQ?purpose=inline)

[SEO Analytics and Audit Dashboard by Anirban Tasfin Azad on Dribbble](https://images.openai.com/static-rsc-4/b2w8tweb1PamKtr-IcJw4ZnfQzKr1oHoWpK96EF85XUTM7nNgHYSZkaTo6r99x7NOCPqHAqOSZVXcbDyINsXJ1GcczhlL-vDy-tPC18REZ3Cii2TEVu2oKe4WJjDBoVYYcUylzH3cN5q8_vH5flnV5fK6hDsKwmIU0s5PbzVp0k?purpose=inline)

12

### Admin routes

| Route                       | Responsibility                          |
| --------------------------- | --------------------------------------- |
| `/admin/login`              | Secure staff sign-in                    |
| `/admin`                    | Dashboard and editorial activity        |
| `/admin/articles`           | Search, filter, edit, archive articles  |
| `/admin/articles/new`       | Create an article                       |
| `/admin/articles/[id]/edit` | Edit and preview                        |
| `/admin/review`             | Editorial review queue                  |
| `/admin/media`              | Upload and manage media assets          |
| `/admin/categories`         | Manage news categories and tags         |
| `/admin/matches`            | Manage fixtures and match reports       |
| `/admin/players`            | Manage profiles and statistics          |
| `/admin/users`              | Staff accounts and role assignments     |
| `/admin/audit-logs`         | Review sensitive changes                |
| `/admin/settings`           | Site settings, navigation, SEO defaults |

### Article editor: what it must support

Rich content editing

Title, slug, excerpt, rich-text body, headings, lists, quotes, inline images, captions, embeds, and preview.

Media management

Direct uploads to object storage using short-lived signed URLs, image validation, generated variants, and alt-text requirements.

Publishing controls

Save draft, autosave, submit for review, schedule, publish, unpublish, and restore a prior revision.

SEO and quality checks

Headline and description, URL slug, canonical URL, featured image, social preview, broken-link checks, and required source notes.

Version history

Keep revision snapshots and record who changed what, when, and why. Protect published articles from accidental edits.

### Editorial workflow

Use a state machine rather than a single `published` boolean.

Draft

Writer creates and autosaves

In review

Editor checks accuracy and sourcing

Approved / scheduled

Publisher approves or sets publish time

Published

Article becomes publicly accessible

Rejected articles return to draft with feedback. Published articles can be corrected, unpublished, or archived with a recorded reason.

For a small team, one person may have multiple roles. Still, enforce the same permissions in the backend.

### Role-based access control

| Capability                  | Writer | Editor   | Publisher | Admin |
| --------------------------- | ------ | -------- | --------- | ----- |
| Create and edit own drafts  | Yes    | Yes      | Yes       | Yes   |
| Edit other writers' content | No     | Yes      | Yes       | Yes   |
| Approve content             | No     | Yes      | Yes       | Yes   |
| Publish or schedule         | No     | Optional | Yes       | Yes   |
| Manage staff and roles      | No     | No       | No        | Yes   |
| View audit logs             | No     | Limited  | Limited   | Yes   |
| Change security settings    | No     | No       | No        | Yes   |

Implement permissions as explicit server-side capabilities, not scattered checks like `if (user.role === "admin")` throughout the application. For higher-risk actions, record the actor, resource, timestamp, and result in an append-only audit trail.

## 5. Backend architecture: modular monolith

I would use NestJS with modules organized around business capabilities. Each module owns its business rules, data access, and service interfaces.

```
apps/
  api/
    src/
      modules/
        auth/
        users/
        permissions/
        articles/
        editorial-workflow/
        authors/
        categories/
        tags/
        media/
        players/
        matches/
        search/
        notifications/
        audit/
      integrations/
        cricket-data/
        object-storage/
        email/
      infrastructure/
        database/
        cache/
        queue/
        observability/
      common/
        validation/
        errors/
        guards/
        logging/
      main.ts

packages/
  contracts/       # API types and generated client contracts
  config/          # Shared lint, TS, and test conventions
```

### Module boundaries

- Articles: content creation, slug uniqueness, revisions, publication status.
- Editorial workflow: transitions, approval requirements, scheduled publication.
- Media: upload authorization, asset metadata, image processing.
- Matches: fixtures, scores, innings, results, match-report links.
- Players: profiles, team-specific player associations, statistics.
- Search: indexing and ranked article retrieval.
- Notifications: email or opt-in browser notifications for breaking stories.
- Audit: administrative actions and sensitive data changes.

The key principle is that the API is the authority. The frontend cannot publish an article merely by changing a local state value; it must request a valid state transition from the backend.

### API design

Version the API from day one and use a consistent error format.

| Method  | Endpoint                              | Purpose                           |
| ------- | ------------------------------------- | --------------------------------- |
| `GET`   | `/api/v1/articles`                    | Public article feed               |
| `GET`   | `/api/v1/articles/:slug`              | Fetch a published article         |
| `GET`   | `/api/v1/categories`                  | Public categories                 |
| `GET`   | `/api/v1/matches`                     | Fixtures and results              |
| `GET`   | `/api/v1/players`                     | Team roster                       |
| `POST`  | `/api/v1/admin/articles`              | Create draft                      |
| `PATCH` | `/api/v1/admin/articles/:id`          | Update permitted fields           |
| `POST`  | `/api/v1/admin/articles/:id/submit`   | Submit for review                 |
| `POST`  | `/api/v1/admin/articles/:id/publish`  | Publish with permission checks    |
| `POST`  | `/api/v1/admin/articles/:id/schedule` | Schedule publication              |
| `GET`   | `/api/v1/admin/audit-logs`            | Retrieve authorized audit records |

Additional recommendations:

- Use cursor-based pagination for article feeds.
- Validate query parameters, request bodies, and uploaded files.
- Add rate limiting and request size limits.
- Use idempotency keys for retry-sensitive operations where appropriate.
- Generate a typed client from OpenAPI instead of duplicating API types manually.
- Keep public article endpoints read-only and expose only published, public-safe data.

## 6. Database design

Use PostgreSQL as the source of truth. Model editorial content and cricket data separately, linking them where it adds value.

users

id · email · status

articles

id · slug · title · excerpt · body · status · published_at · author_id

article_revisions

article_id · version · snapshot

workflow_events

actor · transition · timestamp

categories / tags

Article relationships

media_assets

Storage key · alt text · metadata

matches · players · player_match_stats

Structured cricket data and article associations

### Essential schema decisions

| Entity                 | Important fields                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `users`                | `id`, `email`, `status`, `created_at`                                                         |
| `roles` / `user_roles` | Role definitions and assignments                                                              |
| `articles`             | `id`, `slug`, `title`, `excerpt`, `body`, `status`, `author_id`, `published_at`, `updated_at` |
| `article_revisions`    | `article_id`, `version`, `snapshot`, `created_by`, `created_at`                               |
| `article_categories`   | `article_id`, `category_id`                                                                   |
| `article_tags`         | `article_id`, `tag_id`                                                                        |
| `media_assets`         | `id`, `storage_key`, `mime_type`, `alt_text`, `width`, `height`                               |
| `matches`              | `id`, `season`, `home_team`, `away_team`, `scheduled_at`, `status`, `score_data`              |
| `players`              | `id`, `name`, `role`, `profile_image_id`                                                      |
| `player_match_stats`   | `player_id`, `match_id`, structured performance fields                                        |
| `audit_logs`           | `actor_id`, `action`, `resource_type`, `resource_id`, `created_at`                            |
| `scheduled_jobs`       | `id`, `job_type`, `run_at`, `status`, retry metadata                                          |

A few non-negotiable database practices:

- Make article slugs unique and index publication date, status, and category relationships.
- Store timestamps consistently in UTC; format them for the visitor's locale.
- Use transactions for operations such as publishing and recording the associated workflow event.
- Use optimistic concurrency control, such as a version column, to prevent an editor overwriting someone else's newer changes.
- Keep revisions separate from the current article record.
- Use migrations and backups from the beginning.
- Treat cricket statistics as structured data rather than burying scores inside article text.

One refinement: workflow events and audit logs serve different purposes. Workflow events describe editorial transitions; audit logs record sensitive or administrative actions. You can share infrastructure, but preserve their distinct meanings.

## 7. Performance architecture: especially for live matches

Sports traffic is bursty. A normal article may receive a few hundred visitors, while a major SRH match or breaking-news story can create a sharp spike.

The answer is not automatically more servers. It is to minimize work per request.

1\. CDN and edge caching

Cache public HTML and assets where appropriate. Use immutable, content-hashed asset filenames and long-lived caching for static files.

2\. Server and database caching

Cache popular article responses, home-page feeds, categories, and match summaries. Use explicit TTLs and invalidation on content changes.

3\. Event-driven cache invalidation

When an article publishes or updates, commit the database change and an outbox event atomically. A worker processes the event, invalidates relevant caches, and triggers revalidation.

4\. Controlled live-score updates

If licensed live data is available, poll the provider at an appropriate interval or use its supported push feed. Send updates only to pages or clients that need them.

5\. Background processing

Generate thumbnails, send notifications, update search indexes, and run scheduled publishing outside the main HTTP request.

### The cache-invalidation rule

If an editor publishes a breaking story, readers must not keep seeing the old homepage indefinitely.

Use a flow like this:

1. The API validates the publisher's permissions and article state.
2. The database transaction saves the published version and an outbox event.
3. A worker consumes the event safely, with retries.
4. The worker revalidates the article URL and affected category, feed, and homepage caches.
5. The public website begins serving the new content.

For scheduled publishing, a durable worker should process due articles and safely retry failed jobs. Do not rely on an in-memory timer inside the API process.

## 8. Security architecture

The admin dashboard deserves its own threat model because compromised publishing access means an attacker can publish misinformation, change links, or damage the site's reputation.

| Risk                            | Mitigation                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Unauthorized admin access       | Secure sessions, MFA for privileged users, server-side RBAC                                     |
| Cross-site scripting            | Sanitize rich HTML, use safe rendering, apply a Content Security Policy                         |
| CSRF                            | Appropriate SameSite cookies and CSRF protection for cookie-authenticated mutations             |
| Malicious uploads               | MIME and file-signature checks, size limits, generated filenames, image processing in isolation |
| SQL injection                   | Parameterized queries and safe ORM usage                                                        |
| Brute force and scraping        | Rate limits, WAF rules, sensible abuse controls                                                 |
| Secret leakage                  | Environment/secret manager, least-privilege service credentials                                 |
| Accidental or malicious changes | Revision history, audit trail, backup and recovery                                              |
| API exposure                    | Authorization on every protected operation; never rely on hidden UI controls                    |

For admin authentication, use secure, `HttpOnly`, `Secure`, appropriately configured `SameSite` session cookies. If you choose a managed identity provider, still enforce application-level permissions in your API.

For public traffic, avoid forcing authentication on reading articles. Keep the public read path simple and independently scalable.

## 9. Deployment and infrastructure

For the first production release, I would use managed infrastructure wherever possible. You want to spend your time building an excellent SRH product, not maintaining a Kubernetes cluster.

Git repository + CI/CD

Lint · typecheck · tests · security checks · build

Web deployments

Public Next.js app and admin Next.js app

Preview deployments for pull requests

API deployment

Containerized NestJS application

Health checks and horizontal scaling

Managed data services

PostgreSQL · Redis · Object storage · CDN · Durable job processing

Production operations

Monitoring · alerts · backups · error tracking · rollback

### Infrastructure choices

- Frontend: Vercel or another platform that supports Next.js server rendering and caching.
- API: A managed container platform such as AWS ECS/Fargate, Cloud Run, or a comparable service.
- Database: Managed PostgreSQL with automated backups and point-in-time recovery.
- Cache and queues: Managed Redis and a durable queue or job system.
- Media: S3-compatible object storage with a CDN.
- CI/CD: GitHub Actions or an equivalent pipeline.

You can host both frontend applications under one parent domain—for example, `www.example.com` and `admin.example.com`—while keeping their deployments and access policies separate. The API can live at `api.example.com`.

I would not introduce Kubernetes, Kafka, Elasticsearch, or a fleet of microservices until actual traffic, team size, or operational requirements justify them.

## 10. Monorepo structure

For a project maintained by one developer or a small team, a TypeScript monorepo is a practical choice.

```
srh-platform/
├── apps/
│   ├── web/                  # Public news website
│   ├── admin/                # Editorial dashboard
│   ├── api/                  # NestJS backend
│   └── worker/               # Background jobs
├── packages/
│   ├── contracts/            # Shared API schemas and types
│   ├── ui/                   # Shared UI components
│   ├── config/               # Shared tooling configuration
│   └── utils/                # Small, genuinely shared utilities
├── infrastructure/
│   ├── deployment/
│   └── monitoring/
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── editorial-workflow.md
├── package.json
└── turbo.json
```

Use Turborepo or a similar build orchestrator if the repository grows enough to benefit from incremental builds. Keep domain logic in the backend rather than moving business rules into shared frontend packages.

## 11. Build it in phases

Do not try to implement every feature before launch. Build a reliable publishing system first, then improve the fan experience.

## 01

Foundation

Phase 1 — Editorial MVP

- Public homepage, article listings, and article detail pages.
- Admin login, roles, article editor, draft/publish workflow.
- PostgreSQL schema, media uploads, basic SEO.
- Deployment pipeline, backups, and error monitoring.

Exit criterion: an authorized editor can publish a story end-to-end, and it appears on the public site with correct metadata.

## 02

Content

Phase 2 — Editorial maturity

- Review and approval workflow.
- Revision history, scheduling, category management.
- Search, related articles, author profiles.
- Analytics and content performance reporting.

Exit criterion: multiple contributors can work safely without losing content or bypassing editorial controls.

## 03

Cricket

Phase 3 — SRH-specific features

- Fixtures, results, scorecards, and player profiles.
- Match previews and post-match reports.
- External cricket-data integration, if licensed.
- Optional breaking-news subscriptions and notifications.

Exit criterion: structured cricket data and editorial stories work together without coupling the entire site to an external data provider.

## 04

Scale

Phase 4 — Optimization

- CDN and server-side caching improvements.
- Load tests before high-profile matches.
- Better observability, automated alerts, and recovery drills.
- Advanced search, newsletters, and personalization if justified.

Exit criterion: measured performance and reliability targets are met under realistic traffic and publishing load.

## 12. Non-functional requirements I would set

Define measurable targets before launch rather than simply calling the site "fast" or "scalable."

| Area                    | Initial target                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Public page performance | Aim for Core Web Vitals in the good range: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile |
| API latency             | Establish a p95 target around 200–300 ms for uncomplicated cached or indexed reads                     |
| Availability            | Set an initial 99.9% monthly availability objective if the budget supports it                          |
| Recovery                | Define explicit RPO and RTO; for example, RPO ≤ 15 minutes and RTO ≤ 4 hours                           |
| Security                | MFA for privileged staff, audited publishing, least privilege                                          |
| Data quality            | No duplicate published slugs; no publication without required fields                                   |
| Editorial reliability   | Durable scheduling, retryable jobs, and alerts for failed publications                                 |
| SEO                     | Valid canonical URLs, indexable article pages, sitemap, structured data                                |

These are initial engineering targets, not guarantees. Validate them with production-like tests and revise them based on budget, traffic, and editorial needs.

## 13. What I would deliberately avoid

- Microservices from day one: unnecessary deployment and debugging overhead.
- A custom CMS built before the public site works: prioritize the core publishing workflow first.
- A client-only React news site: weaker default SEO and slower first content for many users.
- Direct frontend-to-database access for admin tasks: business rules and authorization belong on the server.
- A complex real-time WebSocket system immediately: cached fixtures and controlled refreshes may be sufficient at first.
- Unverified automatic news publishing: editorial accuracy is more important than shaving seconds off publication.
- Scraping copyrighted photographs or articles: use properly licensed media and respect source attribution.
- Overengineering the stack: managed services and a clean modular architecture beat a sophisticated diagram with operational debt.

## My final recommendation

Build the first version as a three-application TypeScript monorepo:

- `web`: Next.js for public SRH news, SEO, and fan experience.
- `admin`: Next.js for secure editorial management.
- `api`: NestJS with PostgreSQL, backed by Redis, object storage, and background workers as needed.

Keep the backend a modular monolith. Make article publishing, permissions, revisions, and cache invalidation exceptionally reliable. Treat live cricket data as an optional integration, not a dependency of the entire application.

That gives you a strong production architecture today while leaving a straightforward path to higher traffic, richer match coverage, and a larger editorial team.
