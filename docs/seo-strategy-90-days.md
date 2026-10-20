# SRH Xtra — SEO & AI-Search Growth System

**Audit date:** 20 October 2026
**Scope:** `apps/web` (public site), publishing pipeline (`apps/api` + worker), current build (`7b17763` + working tree)
**Baseline:** 44 indexable URLs — 13 articles, 25 player profiles, 6 static pages. Domain not yet public: `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in both env files.
**Data limitations:** no Search Console, analytics, or backlink tooling connected yet. Code findings are verified against the running build; keyword demand and link figures are labelled as assumptions and must be validated after launch.

---

## 0. Verdict

| Area | Grade | Headline |
|---|---|---|
| Technical foundation | **A−** | Next.js SSG/ISR, 87–105 kB JS, system fonts, priority hero images, strong security headers, sitemap + robots in place. |
| Indexability | **D** | Canonicals, sitemap, robots, OG tags and JSON-LD all point at `localhost`. Nothing can rank until deployed. |
| Site architecture | **C−** | Four real categories exist but have no indexable URLs; category and paginated views canonicalise to `/news`; `/matches` is a "Coming soon" page in the nav. |
| Structured data | **B−** | Squad/player schema is genuinely strong; article schema is incomplete; no site-wide entity graph. |
| Content & topical authority | **C** | 13 articles in ~2 weeks is a good start; no schedule, results, stats, or head-to-head coverage. |
| E-E-A-T | **B−** | About, Contact, Privacy, Terms exist; workflow + revision history exist; missing editorial-standards page, visible update stamps, sourcing discipline. |
| Authority / backlinks | **F** (assumed) | New domain, no earned links. Not measurable until GSC/backlink tooling is connected. |
| AI / GEO readiness | **C+** | Server-rendered content and open crawler access are good foundations; no feeds, answer formats, or AI-referral measurement. |
| Local SEO | **N/A** | No physical location. Do not create a Google Business Profile. Regional relevance is covered in §10. |

### The seven moves that matter most (ranked)

1. **Launch on a real domain and connect measurement** — deploy, set `NEXT_PUBLIC_SITE_URL`, verify in Google Search Console + Bing Webmaster, add privacy-friendly analytics. Everything else is theoretical until this is done.
2. **Turn the four categories into indexable topic hubs** (`/topics/news`, `/topics/match-reports`, `/topics/squad-updates`, `/topics/analysis`) and relink breadcrumbs, chips, and "More" links to them. Converts 13 orphaned-by-canonical articles into four topical clusters.
3. **Complete article structured data** — `publisher` + logo, `articleSection`, `image` fallback, `about`/`mentions` entity links, `BreadcrumbList`, Organization author for desk bylines. Rich-result eligibility + entity clarity for AI retrieval.
4. **Build the match centre** — schedule/results hub with `SportsEvent` schema. This is the single largest unserved intent ("SRH schedule", "SRH vs X", "SRH match today") and the site currently ships a "Coming soon" page for it.
5. **Wire the entity graph** — article ↔ player links (auto-link first mention, related coverage on player pages), site-wide `Organization` + `WebSite` nodes with stable `@id`s, consistent `sameAs`. This is the highest-leverage internal-linking upgrade and the base for AI citations.
6. **Fix crawl hygiene** — paginate the sitemap generation (currently capped at 100 articles), stop stamping static pages with `lastmod = now`, self-canonicalise paginated pages, and `noindex` search-result states.
7. **Build the editorial engine** — 3–5 pieces/week against the cluster map in §7, with an E-E-A-T standards page and visible update timestamps. Authority for a new domain comes from cadence + data + links, not from schema alone.

---

## 1. What is already working (do not rebuild)

1. **Rendering model** — articles are pre-rendered with ISR (`revalidate = 60`), player pages are fully static (`dynamicParams = false`), and content is server-rendered HTML. Crawlers and AI fetchers get complete content without executing JavaScript.
2. **Performance** — 87.3 kB shared JS, 101 kB on article pages, 105 kB on `/squad`. System font stack (no webfont CLS), `next/image` with `sizes` and `priority` on LCP images, reserved aspect ratios.
3. **Security/trust headers** — `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS, CSP. `poweredByHeader` disabled.
4. **Crawl surface** — `robots.ts` allows all crawlers and references the sitemap; `sitemap.ts` is dynamic and includes static pages, profiles, and articles; unknown player slugs return a real 404.
5. **Metadata discipline** — title template (`%s · SRH Xtra`), per-page descriptions and canonicals, per-article OG image route, Twitter cards, `metadataBase` set from env.
6. **Editorial SEO controls** — `seoTitle` / `seoDescription` overrides are wired into `generateMetadata` with clean fallbacks; excerpt → body-derived description fallback.
7. **Entity data already exists** — 25 player profiles with official-feed career stats, portraits, social links exposed as `sameAs`, `memberOf: SportsTeam`, and `Person` + `BreadcrumbList` JSON-LD.
8. **Squad schema** — `SportsTeam` with full roster, countries, and roles; genuinely richer than most cricket sites at this stage.
9. **Internal discovery** — homepage sections by category, related-stories module on articles, squad → profile links, profile prev/next pagers. No orphan pages today.
10. **Trust pages** — About (publication identity + independence statement), Contact (email), Privacy (accurate: no accounts, no ads, no analytics, no cookies), Terms; privacy/terms correctly `noindex` and absent from the sitemap.
11. **Content protection without crawl blocking** — selection/copy deterrents and the `/_next/image` hotlink guard do not block crawlers; `robots` still allows AI agents.
12. **Operational plumbing** — editorial workflow, revision history, tag-based revalidation webhook, worker outbox — the hooks needed for IndexNow and RSS already exist.

---

## 2. Technical audit findings (ranked)

| # | Finding | Evidence | Impact | Fix | Priority | Effort |
|---|---|---|---|---|---|---|
| T1 | Site origin is `localhost` | `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in both env files; canonicals, sitemap, robots, JSON-LD, OG all inherit it | **Blocks all indexing**; Google cannot verify or rank the site | Deploy + set production origin; re-verify every absolute URL | **P0** | S |
| T2 | No measurement | No analytics packages; no GSC verification | No baseline, no diagnosis, no AI-referral data | GSC domain property, Bing Webmaster, privacy-friendly analytics (update Privacy page wording) | **P0** | S |
| T3 | Home page has no `<h1>` | `h1=0`; featured headline renders `<h2>` | Weak topical signal on the most-linked page; accessibility issue | Render a visually hidden `<h1>` (brand + coverage line) or make the featured headline `<h1>` | **P1** | XS |
| T4 | No indexable category hubs | Four categories with descriptions exist; all views are `/news?category=…`, title stays "Latest SRH news", canonical → `/news` | Four topical clusters are invisible; no landing pages for high-intent category queries | Add `/topics/[slug]` hubs; update chips, breadcrumbs, "More" links; canonicalise query view to hub | **P1** | M |
| T5 | Paginated pages canonicalise to page 1 | `/news?page=2` canonical → `/news` | Deep pages can be treated as duplicates; crawl signals degraded as archive grows | Self-canonical for page ≥2; keep filters canonical to hub | **P2** | S |
| T6 | Sitemap article list capped at 100 | `getFeed({ page: 1, pageSize: 100 })` in `sitemap.ts` | Silent loss of older URLs beyond 100 articles | Loop pages until `data.length < pageSize` | **P1** | XS |
| T7 | Static `lastmod` is generated per request | Sitemap shows identical `2026-10-20T10:54:06` for all static routes | Unreliable `lastmod` teaches crawlers to ignore it | Omit `lastmod` on static routes; keep real dates for articles/profiles | **P2** | XS |
| T8 | Article schema incomplete | `NewsArticle` has author, dates, headline, description, mainEntityOfPage; missing `publisher`, `articleSection`, `url`, `image` fallback, `inLanguage`, `about`/`mentions`, BreadcrumbList | Limits Article rich results and entity grounding for AI retrieval | Extend JSON-LD (see §5); add breadcrumb schema | **P1** | S |
| T9 | Desk byline typed as `Person` | `author: { "@type": "Person", name: "SRH Xtra desk" }` | Semantically wrong; weaker publisher identity | Use `Organization` when no named author; add `url` to `/about` | **P2** | XS |
| T10 | No site-wide entity graph | Organization JSON-LD exists only on `/about`; no `WebSite` node; no stable `@id`s | Search/AI engines cannot connect pages to one brand entity | Add Organization + WebSite to root layout with `@id`s; reference from articles and profiles | **P1** | S |
| T11 | No player ↔ article links | Article body sanitizer passes `<a>` but does not link player names; profile pages have no related coverage | Leaves the strongest entity cluster disconnected; weak internal link equity | Auto-link first mention → `/squad/[slug]`; add "Coverage" list on profiles using `getFeed({ search })` | **P1** | M |
| T12 | `/matches` is a thin page in the nav | Renders "Coming soon."; included in sitemap and primary nav | Wasted navigation equity; poor experience on a top intent | Build schedule/results hub (T-data dependency); until then `noindex` + remove from sitemap | **P1** | M |
| T13 | No RSS, news sitemap, or push indexing | No `feed.xml` / `news-sitemap.xml` routes; no IndexNow | Slower discovery of time-sensitive stories; no freshness channel for aggregators/AI | Add RSS + News sitemap; IndexNow ping from the worker on publish/update | **P2** | M |
| T14 | No visible "Updated" timestamp | Only `publishedAt` is rendered; `dateModified` exists in schema | Readers and crawlers cannot see freshness on revised stories | Show "Updated" when `updatedAt` materially exceeds `publishedAt` | **P2** | XS |
| T15 | Listing heading order skips a level | `/news`: `<h1>` then card `<h3>` | Minor semantic/accessibility issue | Card heading level prop: `h2` on listing pages, `h3` inside sections | **P3** | XS |
| T16 | Article breadcrumb is not a list; category links use query strings | `<nav class="meta">` with inline links; `/news?category=…` | Weaker breadcrumb semantics; category link equity lands on filtered view | `<ol>` breadcrumb + links to `/topics/[slug]`; add BreadcrumbList schema | **P2** | XS |
| T17 | External links in article bodies have no rel policy | Sanitizer allows `href/title/rel`, editor can add any `http(s)` link | Editorial risk, not a ranking issue | Add admin guidance; set `rel="noopener noreferrer"` on external links at sanitize time | **P3** | XS |
| T18 | Search/filter states rely on canonical only | `?search=`, `?sort=oldest` canonical → `/news` | Possible low-quality URL indexing at scale | Add `robots: noindex, follow` for search states | **P3** | XS |
| T19 | Admin app shares a host in dev only | Admin on `:3001` (dev), public web on `:3000` | Exposure risk if admin is published | Deploy admin behind auth/VPN on a separate host; `X-Robots-Tag: noindex` + robots disallow at the proxy | **P1 (deploy)** | S |
| T20 | `/api/revalidate` is crawlable | Route exists under the public origin | Crawlers may hit a mutating endpoint | Reject non-POST + `X-Robots-Tag: noindex`; ideally keep API on its own origin | **P3** | XS |

### Core Web Vitals — current evidence and budget

| Metric | Current evidence | Risk | Action |
|---|---|---|---|
| LCP | Hero image `priority`, `sizes` set, fixed aspect ratio, static HTML | Low | Keep; add field-data check once traffic exists |
| CLS | Aspect ratios reserved; system fonts | Low | None |
| INP | Small JS payload, light interactivity | Low | Keep reveal/motion scripts off the critical path |
| TTFB | SSG + ISR + `s-maxage=60` + HIT observed | Low | Ensure reverse proxy/CDN keeps cache headers |
| Budget | 87.3 kB shared / ≤105 kB per route | Guard | Add Lighthouse CI thresholds: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms |

Verify `images.formats` includes AVIF (Next defaults to WebP) and keep the 1200 px+ cover requirement for Discover eligibility.

---

## 3. Launch & indexation runbook (P0 — Days 1–14)

1. **Choose one canonical host** (`https://srhxtra.com` or `https://www.srhxtra.com`) and 301 the other at the proxy.
2. **Set production env** in the deployment (not committed): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_IMAGE_HOSTS`; rebuild (public env is baked into bundles).
3. **Reverse proxy** (Caddy/nginx): TLS, HSTS (already emitted), gzip/brotli, `Cache-Control` passthrough, access logs with UA + referrer (needed for AI-referral analysis).
4. **Verify the crawl surface** on the live host: `/robots.txt`, `/sitemap.xml`, canonical tags, `og:url`, `og:image` absolute URLs, JSON-LD `url` values — no `localhost` anywhere (`grep` the served HTML).
5. **Google Search Console**: domain property via DNS; submit sitemap; request indexing for home, `/news`, `/squad`, `/matches` (when real), `/about`.
6. **Bing Webmaster Tools**: import from GSC; submit sitemap; enables IndexNow eligibility.
7. **Analytics**: self-hosted Plausible/Umami (cookie-free) or equivalent. **Update the Privacy page**: it currently states "we do not use third-party analytics or tracking tools" — add a truthful sentence about privacy-friendly aggregate analytics before enabling.
8. **Admin isolation**: separate host, auth required, `noindex` header; never link to it from the public site.
9. **Bot policy**: keep `User-Agent: *` allowed; confirm the host/WAF does not challenge Googlebot, Bingbot, GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot. (If Cloudflare is used, disable "Bot Fight Mode" for these paths.)
10. **Uptime + error monitoring** on 4xx/5xx (crawl budget protection).
11. **Baseline snapshot**: export GSC performance after 14 days; log index coverage and CWV.
12. **Content protection check**: confirm selection/copy deterrents and the image hotlink guard never touch crawler responses (they don't today).

---

## 4. Architecture & internal linking

### 4.1 URL map — current → target

| Current | Target | Action |
|---|---|---|
| `/news?category=match-reports` | `/topics/match-reports` | New hub route; canonical query views to hub; relink chips, breadcrumbs, "More" |
| `/news?category=analysis` | `/topics/analysis` | Same |
| `/news?category=news` | `/topics/news` | Same |
| `/news?category=squad-updates` | `/topics/squad-updates` | Same |
| `/news?page=2` | Self-canonical paginated URL | Fix canonical metadata |
| `/news?search=…`, `?sort=oldest` | `noindex, follow` | Add robots directive |
| `/matches` ("Coming soon") | `/matches` hub (fixtures/results) | Build or `noindex` + remove from sitemap until real |
| — | `/matches/[fixture]` (future) | Preview/report per fixture with `SportsEvent` |

### 4.2 Topic hub specification

Each hub (`/topics/[slug]`) renders:
- `<h1>` "{Category name}" + the category `description` as an intro (already stored in the API).
- Article grid with pagination (self-canonical page 2+).
- Breadcrumb `Home · Topics · {name}` (with `BreadcrumbList`).
- `CollectionPage` + `ItemList` JSON-LD.
- Link back to `/news`; topics listed on the homepage and footer.

Guardrail: publish a hub only when it has ≥3 articles (all four qualify today if the 13 articles are distributed across them).

### 4.3 Internal linking rules (implement as template behaviour)

1. Every article gets **≥2 inbound internal links** (topic hub + one related article or player page) and **3–6 contextual outbound links**.
2. **First mention of any squad member in an article body links to `/squad/[slug]`** — one link per player per article, never inside headings or existing links. Implement as a sanitizer post-pass with the 25-name map; skip ambiguous surnames.
3. **Player pages gain a "Coverage" block**: `getFeed({ search: player.name, pageSize: 4 })` → linked headlines. This closes the entity loop (article → player → article).
4. Related-stories module stays category-based but switches to hub URLs; add a secondary "More on {player}" rail where the article mentions a player.
5. Never link to a 404: validate slugs against `getAllProfiles()`.
6. Category labels on cards become links to hubs (currently plain `<span class="cat">`).

### 4.4 Breadcrumbs

Replace the article breadcrumb `<nav>` inline links with `<ol>` and point the category crumb at the topic hub. Add `BreadcrumbList` JSON-LD matching the visible trail. Player pages already do this correctly — mirror that pattern.

---

## 5. Structured data blueprint

| Page | Types | Required fields / changes | Status |
|---|---|---|---|
| All pages | `Organization`, `WebSite` | `@id` (`/#organization`, `/#website`), name, url, logo (400×400 exists), `sameAs` (X, Instagram), `email`; `WebSite.publisher` → Organization `@id` | **Add** (move from `/about` to root layout) |
| Article | `NewsArticle` | Add `publisher` (Organization `@id` + logo), `articleSection`, `url`, `image` fallback (`/news/[slug]/opengraph-image`), `inLanguage: "en"`, `isAccessibleForFree: true`, `about` → SportsTeam `@id`, `mentions` → Person `@id`s for named players; desk bylines as `Organization` | **Extend** |
| Article | `BreadcrumbList` | Home → News → Topic → article | **Add** |
| Topic hub | `CollectionPage` + `ItemList` | `name`, `url`, item URLs | **Add** (with hubs) |
| Squad | `SportsTeam` (+ `Person`, `Country`, `OrganizationRole`) | Add `@id` (`/#team`) and `url`; keep roster | Minor |
| Player | `Person` + `BreadcrumbList` | Already strong; add `@id`, keep `sameAs`, `memberOf` → SportsTeam `@id` | Minor |
| Matches | `SportsEvent` | Only with real fixtures: teams, startDate (IST offsets), venue, eventStatus | **Add when built** |
| Quick-answer pages | `FAQPage` | Only genuine Q&A (e.g., "When is SRH's next match?"); never generic filler | Conditional |

Entity IDs are the key upgrade: one `Organization` node referenced from everywhere lets search and AI systems resolve "SRH Xtra" as the same entity across articles, profiles, and hubs.

---

## 6. Semantic HTML & accessibility

- Add the missing home `<h1>` (T3) — visually hidden is acceptable; the featured headline as `<h1>` is stronger.
- Fix heading levels on listing pages (h1 → h2 cards) via a card heading prop (T15).
- Convert article breadcrumbs to `<ol>` (T16).
- Keep `<article>`, `<time dateTime>`, landmarks, skip link — already correct.
- Category chips and card categories become real links (hub URLs) — improves both semantics and crawl paths.
- Alt text: hero uses the headline (good); card images are decorative (`alt=""`, title adjacent) — correct; ensure admin guidance for inline images (alt required).
- Content protection script is accessibility-safe (screen readers unaffected); keep copy-blocking off form fields as it is today.

---

## 7. Search strategy: entities, intent, clusters

### 7.1 Entity map

| Entity | Type | Asset | Signal |
|---|---|---|---|
| SRH Xtra | Organization | `/about`, logo, X/IG | `Organization` + `WebSite` `@id`, `sameAs`, unified name |
| Sunrisers Hyderabad | SportsTeam | `/squad`, articles | `SportsTeam` `@id`, `about` in every article |
| 25 players | Person | `/squad/[slug]` | `Person` + `sameAs` + `memberOf` (already), `mentions` from articles |
| IPL 2026 | SportsEvent/Season | schedule hub (to build), articles | Consistent naming, dates, `SportsEvent` |
| Opponents/venues | SportsTeam/Place | head-to-head pages (to build) | `mentions`; factual alignment |

### 7.2 Intent & cluster architecture

Volumes must be validated in GSC/Keyword Planner after launch; below are the query *patterns* each asset should own.

| Cluster / pillar | Sample query patterns | Landing page | Intent | Priority |
|---|---|---|---|---|
| Brand | "SRH Xtra", "SRH Xtra news", "srhxtra" | `/`, `/about` | Navigational | P1 (own it) |
| Team news | "SRH news today", "Sunrisers Hyderabad latest news", "SRH squad update" | `/topics/news`, `/news` | Informational / news | P0 |
| Squad & players | "SRH squad 2026", "SRH players list", "[player] stats", "[player] SRH" | `/squad`, `/squad/[slug]` | Informational | P0 |
| Match day | "SRH match today", "SRH vs [team] date", "SRH schedule 2026", "SRH match report" | `/matches` hub + fixture pages | Informational / transactional | P0 (largest gap) |
| Analysis | "SRH playing XI", "SRH batting analysis", "SRH strategy" | `/topics/analysis` | Informational / consideration | P1 |
| Transactions | "SRH trade", "SRH auction 2026", "SRH retention news" | `/topics/squad-updates` | News / informational | P1 |
| Comparison / records | "SRH vs [team] head to head", "SRH records", "SRH stats 2026" | New stat/head-to-head pages | Informational | P2 |

**Journey mapping**
- *Discover*: breaking news, match day, schedule — fast, fresh, social-distributed.
- *Engage*: analysis, player profiles, stats — depth, internal links, repeat visits.
- *Return*: bookmarks, X/IG, future newsletter — retention assets.
- *Monetise (later)*: sponsorship/ads on high-traffic hubs — do not compromise CWV or trust.

### 7.3 Content gap backlog (ranked)

| Gap | Why it matters | Format | Effort | Priority |
|---|---|---|---|---|
| Match centre (schedule, results, scorecards) | Biggest unserved intent; nav link currently dead-ends | Data-backed hub + per-match pages | L | **P0** |
| Player coverage loop | 25 profiles have authority but no article links | "Coverage" module + auto-linking | S | **P0** |
| Stats hub | Cricket queries are stat-driven; data already vendored | Sortable tables ("SRH 2026 batting/bowling") | M | P1 |
| Head-to-head pages | Recurring fixtures generate durable queries | 5–8 opponent pages with record + recent meetings | M | P1 |
| Auction/retention tracker | High-intent, seasonal spikes; already publishing trades | Evergreen tracker updated in place | M | P1 |
| Injury/availability tracker | News intent with repeat visits | Running article updated with revisions | S | P2 |
| Season review / records | Linkable, evergreen, PR-friendly | Long-form data piece | M | P2 |
| Explainers ("How SRH's XI is built") | Topical depth; internal-link glue | 3–5 evergreen explainers | M | P2 |

### 7.4 Editorial cadence (target: 3–5/week)

Weekly mix during the season: 1 match preview + 1 match report + 2 news/transaction pieces + 1 analysis/evergreen. Off-season: 2 news + 1 analysis + 1 profile/stats feature + 1 tracker update. Every piece: SEO title/description fields filled, category assigned, ≥3 internal links, first-mention player links, sources cited.

### 7.5 E-E-A-T system

- **Editorial standards page** (`/editorial-standards`, linked in footer + bylines): sourcing rules, correction policy, ownership/funding statement, AI-assistance disclosure.
- **Bylines**: named authors when real; "SRH Xtra Editorial" as an Organization entity otherwise — never an empty byline.
- **Visible dates**: published + "Updated" stamp (T14); revision history already backs corrections.
- **Data attribution**: state the source and snapshot date on stats ("Official SRH feed, 17 Oct 2026") — the data is already vendored and dated.
- **Sourcing in copy**: link official club/player announcements; transfer stories must name the source.
- **About page** already has the independence statement — keep it consistent in all press/PR copy.

---

## 8. AI search & GEO (Google AI Overviews, ChatGPT, Perplexity, Copilot, Gemini)

### 8.1 How sources get picked

AI answers retrieve from indexed, server-rendered pages that (a) rank for the underlying query, (b) contain an extractable direct answer, (c) show freshness and named entities, and (d) come from a recognizable source. Classic SEO is the prerequisite; GEO is about being *quotable*.

### 8.2 On-site requirements (most already true)

1. Server-rendered content — **already** ✓.
2. **Answer-first openings**: first 40–60 words answer the query before context (apply to evergreen pages and match reports).
3. Question-shaped `<h2>`s for recurring intents ("When is SRH's next match?", "Who is SRH's captain?").
4. Tables/lists for stats and schedules (extractable).
5. Visible dates + "Updated" stamps.
6. Entity clarity: consistent names, `sameAs`, `about`/`mentions`, topic hubs.
7. Stable URLs; no content behind client-side tabs.
8. Unique data (official-feed stats, trackers) — this is what gets cited.

### 8.3 Crawler & feed configuration

| Bot / surface | Recommendation |
|---|---|
| Googlebot / Google-Extended | Allow (Google-Extended governs AI training; AI Overviews use Googlebot) |
| Bingbot (Copilot) | Allow |
| GPTBot (OpenAI crawl) / OAI-SearchBot (ChatGPT search) | Allow both |
| PerplexityBot | Allow |
| ClaudeBot / Claude-SearchBot | Allow |
| Host WAF / CDN | Do not challenge the above; verify with a UA test after deploy |
| Feeds | Add RSS (`/feed.xml`) + Google News sitemap (`/news-sitemap.xml`, last 48–72 h); reference in `robots` |
| Push | IndexNow ping from the worker on publish/update (Bing ecosystem; not Google) |

### 8.4 `llms.txt` experiment

Publish a static `/llms.txt` listing the site summary, key hubs, and feed URLs. It is not an official standard and no engine guarantees use — treat it as a low-cost experiment, not a strategy.

### 8.5 Measurement

- **Prompt set**: 20 queries (schedule, captain, squad, squad numbers, recent results, head-to-head, player stats), tested monthly in Google AI Overviews, ChatGPT, Perplexity, Copilot, Gemini. Log: cited? linked? which URL?
- **Referrals**: map referrer hosts (`chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`, `gemini.google.com`) in analytics; self-hosted logs can be parsed for AI bot hits.
- **Baseline is zero** — record the first snapshot the week the domain is live.

---

## 9. Authority: digital PR, backlinks, brand mentions

Assumption: new domain, near-zero referring domains. Strategy is asset-led, not volume-led.

**Link-worthy assets**
1. **SRH 2026 squad tracker** — canonical, always-current, shareable.
2. **Stats pieces** from the vendored official feed (batting/bowling splits, milestone trackers).
3. **Match centre** (schedule/results) — the page people bookmark and cite.
4. **Head-to-head records** — evergreen citation targets.

**Outreach**
- 10 targeted pitches/week to cricket blogs, Telugu sports outlets, podcasts, and newsletters.
- Newsjack trades, injuries, and milestones within hours; offer data/quotes, not link requests.
- Convert unlinked brand mentions (Google Alerts) with a short, non-spammy note.
- Keep X/Instagram bios consistent (name, logo, site URL) — brand-entity consistency feeds knowledge-graph confidence.
- **Do not** buy links, join PBNs, or mass-guest-post.

**Targets (90 days, operating goals):** 10–20 relevant referring domains; 3–5 pieces that earn links on their own; brand-mention log with ≥10 entries.

---

## 10. Local SEO

Not applicable: SRH Xtra has no physical location and should not create a Google Business Profile. Regional leverage instead:
- Publish on IST match-day rhythms; time breaking posts to Indian audience hours.
- Pitch Hyderabad/Telugu outlets for coverage and links.
- Evaluate a Telugu-language section only after English traction (hreflang required if it happens).
- Keep NAP-like consistency only for brand identity (name, logo, URL, email) across profiles.

---

## 11. 90-day roadmap

### Phase 1 — Days 1–14: Launch & foundations (P0)

| # | Workstream | Task | Owner | Impact | Done when |
|---|---|---|---|---|---|
| 1 | Infra | Domain, TLS, proxy, production env, admin isolation | Dev | Unblocks all SEO | No `localhost` in served HTML |
| 2 | Measurement | GSC + Bing + analytics; Privacy page updated | Dev/Editor | Baseline + AI referrals | Properties verified, sitemap submitted |
| 3 | Schema | Organization + WebSite site-wide; article schema completion; breadcrumbs | Dev | Rich results + entity graph | Validator passes; publisher/logo present |
| 4 | Crawl | Sitemap pagination fix; static `lastmod` fix; self-canonical pagination; `noindex` search states | Dev | Crawl hygiene | Sitemap complete; page 2 canonical self |
| 5 | Semantics | Home `<h1>`; listing heading levels; breadcrumb `<ol>` | Dev | Signal + a11y | h1=1 on every page |
| 6 | Quality | `/matches` noindex + remove from sitemap until real | Dev | Protects quality signals | Sitemap has no thin page |
| 7 | Ops | Lighthouse CI budget in e2e | Dev | CWV guardrail | CI fails on LCP > 2.5 s |

**Exit criteria:** live domain indexed in GSC, 100% of sitemap URLs valid, all schema valid, baseline dashboard ready.

### Phase 2 — Days 15–45: Architecture & content engine (P1)

| # | Workstream | Task | Owner | Impact | Done when |
|---|---|---|---|---|---|
| 8 | Architecture | `/topics/[slug]` hubs for all four categories; relink chips/breadcrumbs/related | Dev | Four indexable clusters | Hubs in sitemap, ≥3 articles each |
| 9 | Internal links | Player auto-linking; "Coverage" module on profiles; card category links | Dev | Entity loop, link equity | Each profile links to ≥1 article; each article to ≥1 profile |
| 10 | Content | Match centre (schedule/results/`SportsEvent`) or staged data plan | Dev/Editor | Largest intent gap | Hub live with real fixtures |
| 11 | Feeds | RSS + news sitemap + IndexNow from worker | Dev | Discovery/freshness | Feed validates; IndexNow returns 200/202 |
| 12 | E-E-A-T | Editorial standards page; visible "Updated"; sourcing rules in admin guidance | Editor | Trust/quality | Page linked from footer + bylines |
| 13 | Content | 25–30 new pieces against §7.3 (≥3/ week) | Editor | Topical authority | Cadence held 4 weeks |
| 14 | Data | Stats hub v1 (career/season tables from feed) | Dev/Editor | Linkable asset | Live + internally linked |
| 15 | SEO ops | Per-article checklist in admin (title/description/category/links/sources) | Editor | Consistency | Checklist used on all new pieces |

**Exit criteria:** 35+ articles, four hubs, match centre live, internal-link rules automated, RSS/IndexNow running.

### Phase 3 — Days 46–90: Authority, GEO & optimisation (P2)

| # | Workstream | Task | Owner | Impact | Done when |
|---|---|---|---|---|---|
| 16 | Digital PR | Publish 2 data assets; 10 pitches/week; unlinked-mention harvesting | Growth | Backlinks/brand | 10–20 referring domains |
| 17 | Content | Head-to-head pages (5–8), auction/retention tracker, season review | Editor | Durable queries | Live + linked |
| 18 | GEO | Answer-first rewrite of top pages; question H2s; prompt-set tracking; `llms.txt` | Editor/Dev | AI citations | ≥3/20 prompts cite or link |
| 19 | CWV | Field data review (GSC CWV); fix any regressions; AVIF verification | Dev | Performance stability | 90%+ URLs "Good" |
| 20 | Discover/News | 1200 px+ cover images, headline discipline; apply to Google News when eligible | Editor | Distribution | Discover impressions logged |
| 21 | Iteration | Query-gap mining from GSC; prune/merge thin pages; refresh top 10 posts | Editor | Compounding growth | Monthly refresh cycle running |

**Weekly operating rhythm:** Monday — GSC/analytics review + query gaps; Tue–Fri — publishing cadence; Friday — internal-link + schema QA pass; monthly — backlink/AI-prompt/technical audit.

---

## 12. Measurement & KPIs

### Baseline (20 Oct 2026)

| Metric | Value |
|---|---|
| Indexable URLs in sitemap | 44 (13 articles, 25 profiles, 6 pages) |
| Articles published | 13 |
| Referring domains | ~0 (assumed; verify after GSC) |
| GSC / Bing / Analytics | Not connected |
| Lab performance | 87–105 kB JS; SSG/ISR; strong headers |

### KPI tree

**North Star:** qualified organic sessions that reach content (news, profiles, match pages).

Leading indicators:
- Index coverage: indexed / canonical sitemap URLs.
- GSC impressions and CTR by cluster.
- Rankings (top 20) for 10–15 tracked non-brand queries by day 90.
- Publishing cadence and articles with complete SEO fields.
- Internal links per article; orphan count = 0.
- Referring domains / brand mentions.
- AI prompt citations (monthly log).
- CWV "Good" share once field data exists.

### 30 / 60 / 90 targets (operating goals, not guarantees)

| Horizon | Targets |
|---|---|
| Day 30 | Domain live; 100% sitemap indexed; schema + crawl fixes shipped; 4 topic hubs; 20+ articles; baseline dashboards |
| Day 60 | 30–35 articles; match centre live; player↔article loop automated; RSS/IndexNow live; 5–10 referring domains; first AI-citation snapshot |
| Day 90 | 45–60 articles; 10–20 referring domains; impressions 3–5× week-2 baseline; 10–15 queries in top 20; ≥3/20 AI prompts citing; 90%+ CWV Good (where field data exists) |

Tooling: GSC, Bing Webmaster, privacy-friendly analytics, Lighthouse CI, Google Alerts, optional Ahrefs/Semrush for links and volumes. Report weekly (numbers) and monthly (strategy).

---

## 13. Guardrails & risks

1. **Privacy-policy consistency** — the page currently promises no analytics and no cookies. Adding analytics requires a truthful policy update; cookie-free analytics keeps the cookie statement valid.
2. **Image licensing** — player portraits are referenced from the official feed (© Sun TV Network / SRH); IPL imagery belongs to rights holders. Keep editorial-use framing, never re-host, and prefer official/own imagery for social cards.
3. **Schema accuracy** — no fake FAQs, ratings, or events; every field must reflect visible content.
4. **Thin-page discipline** — do not index empty hubs or the placeholder matches page; publish at ≥3 articles per hub.
5. **Content protection vs discovery** — the copy deterrent is fine, but never block crawlers or AI fetchers; keep `robots` open and WAF exceptions in place.
6. **No link buying / PBNs / spun content** — the editorial workflow exists; use human review and cite sources.
7. **Deploy isolation** — admin panel must never share the public host; API mutating endpoints must reject GET and be `noindex`.
8. **AI Overviews are earned, not forced** — ranking + extractable answers + entity clarity come first; do not chase AIO with schema spam.

---

## 14. File-level implementation backlog (ordered)

| # | File / area | Change | Acceptance |
|---|---|---|---|
| 1 | deployment env | `NEXT_PUBLIC_SITE_URL`, API/image hosts | Served HTML contains no `localhost` |
| 2 | `apps/web/app/layout.tsx` | Organization + WebSite JSON-LD with `@id`; remove duplicate from `/about` | Rich Results test passes on home |
| 3 | `apps/web/app/news/[slug]/page.tsx` | Complete NewsArticle (publisher/logo, articleSection, url, image fallback, inLanguage, isAccessibleForFree, about/mentions); BreadcrumbList; Organization author for desk; visible Updated stamp | Validator passes; byline linked |
| 4 | `apps/web/app/sitemap.ts` | Paginate articles until exhausted; omit static `lastmod`; add hubs when created | Sitemap includes every article; stable lastmod |
| 5 | `apps/web/app/news/page.tsx` | Self-canonical for page ≥2; `noindex` for `?search=`; canonical category views to hubs | Page 2 canonical self; search noindex |
| 6 | `apps/web/app/topics/[slug]/page.tsx` (new) | Category hub + CollectionPage/ItemList + breadcrumb + pagination | Four hubs 200; in sitemap |
| 7 | `apps/web/app/page.tsx` + `components/ArticleCard.tsx` | Home `<h1>`; card heading-level prop; card category links | One h1; no skipped levels |
| 8 | `apps/web/lib/autolink.ts` (new) + article page | First-mention player links | 25-name map; no links inside headings/anchors |
| 9 | `apps/web/app/squad/[playerSlug]/page.tsx` | "Coverage" list via `getFeed({ search })` | Each profile links to related articles |
| 10 | `apps/web/app/matches/page.tsx` | Real hub with `SportsEvent` (or noindex + remove from sitemap now) | No thin page indexed |
| 11 | `apps/web/app/feed.xml/route.ts`, `news-sitemap.xml/route.ts` (new) | RSS + news sitemap; link in layout/robots | Valid feeds |
| 12 | `apps/api` worker | IndexNow ping on publish/update | 200/202 responses |
| 13 | `apps/web/app/editorial-standards/page.tsx` (new) | Standards/sourcing/corrections/ownership | Linked from footer + bylines |
| 14 | `apps/web/next.config` | Verify AVIF in `images.formats`; Lighthouse CI thresholds | CI budget enforced |
| 15 | proxy/admin | Admin isolation, `X-Robots-Tag: noindex`, API route hardening | Admin not publicly crawlable |

---

**Assumptions:** keyword demand, competitiveness, and backlink counts require GSC/Keyword Planner/Ahrefs data post-launch; the roadmap orders work by dependency and leverage, not by speculative volume. This document changes no site code.
