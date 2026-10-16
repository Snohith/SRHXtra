-- 002_article_cover: featured image support for the admin editor (Step 3).
-- Nullable so existing rows stay valid; publish-readiness is enforced in the
-- admin UI (title/body/category/excerpt/cover required before submit).

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

ALTER TABLE article_revisions
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
