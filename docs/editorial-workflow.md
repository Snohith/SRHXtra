# SRHXtra Editorial Workflow

This project is local-file based. Editors do not need a CMS. To publish, you replace or add Markdown and JSON files, then rebuild the site.

## Before you edit anything

1. Work from the templates in `content/_templates/`.
2. Keep `editorialStatus: replace-before-launch` on anything that is still draft or seed material.
3. Change `editorialStatus` to `verified` only after a human checks the facts.
4. Use only local images inside `public/`.

## Slug rules

- Use lowercase letters, numbers, and hyphens only.
- Do not use spaces, underscores, punctuation, or dates unless the route truly needs them.
- Keep slugs short and descriptive.
- Example: `cummins-sets-the-tone-early`

## Alt text rules

- Describe what is actually in the image, not that it is an image.
- Keep it specific and readable.
- Mention the subject, moment, or purpose of the image.
- Avoid filler like "photo of", "image of", "placeholder", or "graphic showing" unless needed for clarity.

Good:

- `Pat Cummins walking out for the toss in Hyderabad`
- `Supporters lifting orange flags before the opening over`

Weak:

- `SRH image`
- `Placeholder graphic`

## How to add a news post

1. Copy `content/_templates/news-article.md`.
2. Save it in `content/news/` with a filename that matches the slug.
3. Fill every `[REPLACE_*]` token.
4. Set `editorialStatus`:
   - use `replace-before-launch` while drafting
   - use `verified` once a human confirms the facts
5. Add the cover image and OG image to `public/images/articles/`.
6. Check the new route at `/news/[slug]/`.

Required fields:

- `slug`
- `title`
- `excerpt`
- `publishedAt`
- `author`
- `category`
- `tags`
- `coverImage`
- `coverAlt`
- `seoTitle`
- `seoDescription`
- `draft`
- `editorialStatus`

## How to add a match coverage post

1. Copy `content/_templates/match-coverage-article.md`.
2. Save it in `content/match-coverage/`.
3. Verify the result, venue, and match context before setting `editorialStatus: verified`.
4. If the schedule should link to the story, update `content/data/schedule.json` with the matching `reportSlug`.

Required fields:

- same as a news post

## How to add an exclusive

1. Copy `content/_templates/exclusive-article.md`.
2. Save it in `content/exclusives/`.
3. Keep the tags tight and descriptive.
4. Do not mark it `verified` until the reporting, quotes, and framing are checked by a human editor.

Required fields:

- same as a news post

## How to add a gallery album

1. Copy `content/_templates/gallery-album.json`.
2. Save it in `content/gallery/albums/`.
3. Add the matching local images to `public/images/gallery/`.
4. Give every photo a useful `alt`.
5. Keep captions factual and concise.

Required fields:

- `slug`
- `title`
- `description`
- `publishedAt`
- `updatedAt`
- `coverImage`
- `coverAlt`
- `tags`
- `seoTitle`
- `seoDescription`
- `editorialStatus`
- `photos`

Each photo needs:

- `src`
- `alt`
- `width`
- `height`

## How to update the squad

1. Open `content/data/squad.json`.
2. Update player records directly or copy from `content/_templates/squad-player.json`.
3. Verify names, roles, nationality, styles, stats, and jersey numbers before switching to `verified`.
4. Replace player illustrations in `public/images/players/` when final assets are available.

Required player fields:

- `slug`
- `name`
- `fullName`
- `role`
- `nationality`
- `image`
- `imageAlt`
- `bio`
- `stats`
- `editorialStatus`

## How to update the schedule

1. Open `content/data/schedule.json`.
2. Add or edit fixtures directly, using `content/_templates/fixture.json` as the model.
3. Verify opponent, date, time, venue, and result.
4. Add `reportSlug` only when the linked match-coverage post exists.

Required fixture fields:

- `id`
- `slug`
- `competition`
- `opponent`
- `date`
- `time`
- `venue`
- `homeAway`
- `status`
- `editorialStatus`

## How to edit the about page

1. Open `content/pages/about.md`.
2. Keep the tone publication-level and evergreen.
3. Avoid implementation notes, phase notes, or technical scaffolding text.
4. Use `content/_templates/about-page.md` if you want to rewrite from scratch.

Required fields:

- `title`
- `seoTitle`
- `seoDescription`

## How to update site-wide brand info

Edit `content/data/site.json` when you need to change:

- site name
- tagline
- footer headline
- default description
- social links
- contact email
- navigation labels
- homepage feature slugs

Important:

- `siteUrl` is only the fallback base URL.
- Production builds can override it with `NEXT_PUBLIC_SITE_URL`.
- Do not change route paths casually once the site is live.

## What to verify before publishing

- Title reads clearly on mobile.
- Slug is clean and final.
- Excerpt matches the real story.
- Date and author are correct.
- Tags are useful and not bloated.
- Cover image exists locally.
- OG image is suitable for sharing.
- Alt text is specific and not generic.
- Internal links point to real routes.
- `editorialStatus` is `verified` for anything that is going live.
