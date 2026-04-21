# SRHXtra

SRHXtra is a fully static cricket media site built with Next.js 15 App Router, TypeScript, Tailwind CSS, and local Markdown/JSON content only.

## Stack

- Next.js 15
- App Router
- TypeScript
- Tailwind CSS
- Static export only
- Local Markdown and JSON content
- Local images in `public/`

## Content

- News: `content/news/*.md`
- Match coverage: `content/match-coverage/*.md`
- Points table: `content/data/points-table.json`
- Gallery albums: `content/gallery/albums/*.json`
- Schedule: `content/data/schedule.json`
- Squad: `content/data/squad.json`
- Site config: `content/data/site.json`

Editorial handoff docs:

- `docs/content-replacement-map.md`
- `docs/editorial-workflow.md`
- `docs/launch-content-checklist.md`
- `content/_templates/`

## Official data sync

SRHXtra now includes an official-first sync system for the site’s major live-data surfaces:

- Schedule and results: `content/data/schedule.json`
- Squad: `content/data/squad.json`
- Filtered official SRH news feed: `content/data/official-news-feed.json`
- Local non-match news entries: `content/news/official-news-*.md`
- Match coverage source data: `content/data/match-coverage-sources.json`
- Points table: `content/data/points-table.json`
- Gallery albums: `content/gallery/albums/official-gallery-*.json`

The sync stays inside the existing static-export architecture. It writes local JSON files only and does not add a database, CMS, or runtime-only service.

### Source priority

Schedule and results:

1. Official IPL pages:
   - `https://www.iplt20.com/teams/sunrisers-hyderabad/schedule`
   - `https://www.iplt20.com/teams/sunrisers-hyderabad/results`
   - `https://www.iplt20.com/matches/fixtures`
2. Official IPL structured feeds used by those pages:
   - `https://scores.iplt20.com/ipl/mc/competition.js`
   - `https://scores.iplt20.com/ipl/feeds/{competitionId}-matchschedule.js`
   - `https://scores.iplt20.com/ipl/feeds/stats/{season}-matchlinks.js`

Squad:

1. Official IPL SRH team page:
   - `https://www.iplt20.com/teams/sunrisers-hyderabad`
2. Official IPL player profile pages:
   - `https://www.iplt20.com/players/{player-slug}/{player-id}`

News:

1. Official IPL SRH team news:
   - `https://www.iplt20.com/teams/sunrisers-hyderabad/news`
2. The news sync keeps only non-match SRH items:
   - injury replacements
   - captaincy/leadership updates
   - squad and availability updates
   - official team announcements

Gallery:

1. Official SunRisers Hyderabad gallery:
   - `https://www.sunrisershyderabad.in/gallery`
2. Album detail pages on the same domain for per-photo metadata

Match coverage sources:

1. Official IPL SRH results page:
   - `https://www.iplt20.com/teams/sunrisers-hyderabad/results`
2. Official IPL fixtures/results page:
   - `https://www.iplt20.com/matches/fixtures`
3. Official IPL structured feeds:
   - `https://scores.iplt20.com/ipl/feeds/{competitionId}-matchschedule.js`
   - `https://scores.iplt20.com/ipl/feeds/stats/{season}-matchlinks.js`
4. Official IPL match reports for completed SRH matches

Points table:

1. Official IPL points-table page:
   - `https://www.iplt20.com/points-table/men`
2. Official IPL standings feed:
   - `https://scores.iplt20.com/ipl/feeds/stats/{competitionId}-groupstandings.js`

Official images are referenced from source URLs only. The sync does not download or rehost them locally.

### Manual run

```bash
npm run sync:official
```

Dry run without writing:

```bash
npm run sync:official -- --dry-run
```

Run a specific IPL season:

```bash
npm run sync:official -- --season 2026
```

Individual pipelines:

- `npm run update:schedule`
- `npm run sync:squad`
- `npm run sync:news`
- `npm run sync:match-coverage-sources`
- `npm run sync:points-table`
- `npm run sync:gallery`

### What the sync does

- fetches official SRH data from the source pages above
- normalizes each surface into local Markdown/JSON files the site already reads
- validates required fields before writing
- logs which source was used, what changed, and which optional fields were missing
- skips rewriting unchanged files
- aborts instead of overwriting when required official data is malformed or incomplete

### Validation and safety

- Required fields still have to validate before any write completes.
- Optional fields that official sources do not expose consistently are left null or empty and logged.
- Completed fixtures must include a verified `result`.
- The sync does not invent fixtures, venues, times, results, report links, player bios, or article bodies.
- News sync writes only short verified summaries for off-field SRH items and excludes match reports/previews.
- Match coverage automation syncs verified source facts; full reports remain local Markdown so editorial quality stays controlled.
- Official gallery images remain source references; review rights before any local download or rehosting.

### Trusted fallback policy

The automation stays official-first by default. Trusted fallbacks are for manual verification and troubleshooting only:

- ESPNcricinfo
- Cricbuzz

The sync is intentionally conservative for a static site: when required official data is incomplete, it fails safely instead of guessing.

### GitHub Actions automation

The repository includes `.github/workflows/update-srh-schedule.yml`.

It can:

- run on a timer every 6 hours
- run on demand with `workflow_dispatch`
- run the full official sync pipeline
- commit only changed synced data files back to the repository

That commit can then trigger the normal static build and deployment flow already used by the site.

### Troubleshooting source failures

1. Run `npm run sync:official -- --dry-run` locally.
2. Check the logged source URLs and the missing-field output.
3. If squad parsing fails, inspect:
   - `https://www.iplt20.com/teams/sunrisers-hyderabad`
   - `https://www.iplt20.com/players/{player-slug}/{player-id}`
4. If news parsing fails, inspect:
   - `https://www.iplt20.com/teams/sunrisers-hyderabad/news`
5. If match-coverage source syncing fails, inspect:
   - `https://www.iplt20.com/teams/sunrisers-hyderabad/results`
   - `https://www.iplt20.com/matches/fixtures`
   - `https://scores.iplt20.com/ipl/feeds/stats/2026-matchlinks.js`
6. If points-table parsing fails, inspect:
   - `https://www.iplt20.com/points-table/men`
   - `https://scores.iplt20.com/ipl/feeds/stats/284-groupstandings.js`
7. If gallery parsing fails, inspect:
   - `https://www.sunrisershyderabad.in/gallery`
   - `https://www.sunrisershyderabad.in/gallery/{album-id}`
8. If schedule parsing fails, inspect:
   - `https://scores.iplt20.com/ipl/mc/competition.js`
   - `https://scores.iplt20.com/ipl/feeds/284-matchschedule.js`
9. Verify any missing official details manually against ESPNcricinfo or Cricbuzz before changing the normalizers.
10. Re-run the sync and confirm that only the intended local data files change.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run typecheck
npm run build
```

The static output is written to `out/`.

## Production URL configuration

`content/data/site.json` contains the fallback site configuration used locally. For real deployments, set the public URL at build time:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BASE_PATH` only when deploying under a repo subpath

Build-time environment variables always take precedence over the fallback `siteUrl` in `content/data/site.json`. Treat the JSON value as a local/sample default, not the final production source of truth.

### Custom domain example

```bash
NEXT_PUBLIC_SITE_URL=https://srhxtra.com npm run build
```

### GitHub Pages project site example

```bash
NEXT_PUBLIC_SITE_URL=https://your-user.github.io/SRHXtra \
NEXT_PUBLIC_BASE_PATH=/SRHXtra \
npm run build
```

Rules:

- `NEXT_PUBLIC_SITE_URL` should always be the full final public URL.
- For GitHub Pages project sites, `NEXT_PUBLIC_SITE_URL` must include the repo subpath.
- Leave `NEXT_PUBLIC_BASE_PATH` empty for custom domains or root-domain hosting.

## Vercel Deployment

Recommended for seamless Next.js static exports.

Build settings:

- Framework preset: `Next.js`
- Build command: `npm run build`
- Output directory: `out`

Environment variables:

- `NEXT_PUBLIC_SITE_URL=https://your-domain.com`

Suggested deployment flow:

1. Connect the repository to Vercel.
2. In Project Settings > General, ensure the Framework Preset is Next.js and Output Directory is overridden to `out`.
3. Set `NEXT_PUBLIC_SITE_URL` to your production domain in the Environment Variables.
4. Deploy the project.
5. Verify `/robots.txt`, `/sitemap.xml`, and canonical tags in the live environment.

## Cloudflare Pages

Build settings:

- Framework preset: `Next.js`
- Build command: `npm run build`
- Build output directory: `out`

Environment variables:

- `NEXT_PUBLIC_SITE_URL=https://your-domain.com`

Notes:

- No adapter is required.
- No server runtime is required.
- Custom domain deployments usually do not need `NEXT_PUBLIC_BASE_PATH`.
- Canonical URLs, Open Graph URLs, `robots.txt`, and `sitemap.xml` will all use `NEXT_PUBLIC_SITE_URL`.

Suggested deployment flow:

1. Connect the repository to Cloudflare Pages.
2. Set `NEXT_PUBLIC_SITE_URL` to the real production domain in the Pages project settings.
3. Run the standard build with output directory `out`.
4. After the first deploy, verify `/robots.txt`, `/sitemap.xml`, and one article page in the live environment.

## GitHub Pages

This project supports GitHub Pages static hosting, including repo-subpath deployment.

Environment variables for a repo site:

- `NEXT_PUBLIC_SITE_URL=https://your-user.github.io/SRHXtra`
- `NEXT_PUBLIC_BASE_PATH=/SRHXtra`

Notes:

- `.nojekyll` is included in `public/` and must remain in place.
- `trailingSlash: true` is enabled for static host compatibility.
- `basePath` and `assetPrefix` are configured from `NEXT_PUBLIC_BASE_PATH` in `next.config.ts`.

Suggested deployment flow:

1. Build with the GitHub Pages environment variables set.
2. Publish the generated `out/` directory.
3. Confirm the published site is available under the repo subpath and that `/_next/` assets load correctly.
4. If you later move to a custom domain, remove `NEXT_PUBLIC_BASE_PATH` and update `NEXT_PUBLIC_SITE_URL`.

## Pre-deploy checklist

1. Set `NEXT_PUBLIC_SITE_URL` to the real production URL.
2. Set `NEXT_PUBLIC_BASE_PATH` only if the site will live under a repo subpath.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Confirm `robots.txt`, `sitemap.xml`, canonicals, and OG URLs match the intended deployment URL.
6. Confirm all content and local images are present in `out/`.
