-- 005_editorial_extras: SEO overrides + richer revision snapshots.
--
-- seo_title / seo_description override the headline and summary for <title>,
-- meta description, and social cards (the web tier falls back to
-- title/excerpt when unset). They ride along in every revision snapshot so
-- the diff view and revision restore cover them too.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS seo_title TEXT
  CHECK (seo_title IS NULL OR char_length(seo_title) BETWEEN 1 AND 200);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS seo_description TEXT
  CHECK (seo_description IS NULL OR char_length(seo_description) BETWEEN 1 AND 300);

ALTER TABLE article_revisions ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE article_revisions ADD COLUMN IF NOT EXISTS seo_description TEXT;
