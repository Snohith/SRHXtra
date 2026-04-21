# SRHXtra Content Replacement Map

Use this map to decide what can ship now, what must be replaced, and what needs verification before launch.

| Path | Bucket | Why | Editor action |
| --- | --- | --- | --- |
| `content/data/site.json` | needs human verification | Brand copy is launch-shaped, but the domain, email, and social destinations must match the real publication. | Verify domain, inbox, social handles, tagline, and organization description. |
| `content/pages/about.md` | brand copy ready | The page now reads like a real editorial brand page and does not contain build-phase scaffolding. | Review tone and update only if the editorial mission changes. |
| `content/news/orange-core-holds-shape-under-pressure.md` | seed/demo content | Structured correctly, but still seed reporting. Marked `editorialStatus: replace-before-launch`. | Replace with real reporting or remove before launch. |
| `content/news/rising-depth-gives-srh-rotation-confidence.md` | seed/demo content | Structured correctly, but still seed reporting. Marked `editorialStatus: replace-before-launch`. | Replace with real reporting or remove before launch. |
| `content/match-coverage/clinical-chase-sets-the-tone.md` | seed/demo content | Match coverage format is ready, but the story is still seed/demo content. | Replace with a real match report and verify every result detail. |
| `content/exclusives/inside-the-orange-engine-room.md` | seed/demo content | Good structural model for a feature, but not verified editorial reporting. | Replace with a real exclusive or hold back until ready. |
| `content/gallery/albums/opening-night-energy.json` | seed/demo content | Album structure is correct, but captions and framing are still launch-seed material. | Replace title, description, captions, and photos with real gallery content. |
| `content/data/schedule.json` | needs human verification | Fixture data can easily become inaccurate. File is marked `replace-before-launch`. | Verify every opponent, date, venue, result, and linked report slug. |
| `content/data/squad.json` | needs human verification | Player roles, stats, and bios require human fact-checking. File is marked `replace-before-launch`. | Verify every player field, especially stats, roles, and image selection. |
| `public/images/articles/` | placeholder asset | Current SVGs are usable layout stand-ins, not launch-grade editorial art. | Replace with final local hero/cover artwork before launch. |
| `public/images/gallery/` | placeholder asset | Current gallery files are stylized stand-ins, not publication imagery. | Replace with final local gallery assets and re-check alt text/captions. |
| `public/images/players/` | placeholder asset | Current player portraits are stylized placeholders. | Replace with final local player imagery or approved editorial illustrations. |
| `public/images/site/` | ready after manual asset replacement | Logo mark is serviceable, but hero/supporting site artwork should be reviewed against final brand standards. | Keep the logo if approved; replace the hero graphic if final brand art exists. |
| `public/og/` | ready after manual asset replacement | OG image works as a fallback, but a final launch share image would be stronger. | Replace with a final social/share graphic if available. |

## Status convention

- `verified`: safe to treat as real editorial content after human checking.
- `replace-before-launch`: seed/demo material that should not be treated as verified reporting.

Current seed posts, gallery data, schedule data, and squad data are marked `replace-before-launch`.
