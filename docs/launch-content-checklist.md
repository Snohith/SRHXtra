# SRHXtra Launch Content Checklist

Use this before moving from seed content to a real launch.

## Per article or feature

- Title is final, clear, and publication-ready.
- Slug is lowercase and hyphenated.
- Excerpt matches the real story.
- Publish date is correct and in ISO format.
- Author is correct.
- Tags are relevant and not excessive.
- Cover image exists locally.
- OG image is suitable for sharing.
- Alt text is specific and useful.
- `editorialStatus` is `verified`.
- Related/internal links point to real routes.
- No draft language, placeholder wording, or scaffolding copy remains.

## Per gallery album

- Album title and description are final.
- Cover image exists locally.
- Every photo has alt text.
- Every caption is factual and concise.
- Photo dimensions are correct.
- `editorialStatus` is `verified`.

## Schedule and results

- Every fixture date is verified.
- Every opponent and venue is verified.
- Every result is verified.
- Every `reportSlug` points to a real match-coverage article.
- `editorialStatus` is `verified` for the file and the relevant fixtures.

## Squad

- Every player name and role is correct.
- Batting and bowling styles are correct.
- Jersey numbers are correct if listed.
- Stats are human-verified.
- Player bios do not overstate uncertain claims.
- Final local player assets are in place if replacing placeholders.
- `editorialStatus` is `verified` for the file and the relevant players.

## Site-wide brand checks

- Contact email is correct.
- Social links are correct.
- Domain in `site.json` matches the intended publication domain.
- About page reflects the real editorial mission.
- Header and footer labels are final.
- Homepage featured slugs point to the intended live content.

## SEO and link checks

- Canonical URLs point to the intended production base URL.
- OG and Twitter images look acceptable.
- Internal links work.
- About page, archive pages, and detail pages do not surface seed/demo wording.

## Final launch decision

- No file that is still public-facing remains marked `replace-before-launch`.
- Any intentionally unpublished file is either removed or set `draft: true`.
- Human fact-checking is complete for fixtures, results, player stats, bios, and reporting.
