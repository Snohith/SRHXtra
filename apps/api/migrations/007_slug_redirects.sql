-- 007_slug_redirects: keep old published URLs working after a slug change.
--
-- When an editor renames a published story, the old slug is recorded here and
-- the public API resolves it to the current article; the web app then issues a
-- permanent redirect to the canonical URL instead of a 404.
-- shortcut: a later article may reuse an old slug (the table does not reserve
-- it); upgrade to a reserved-slug check if that happens in practice.

CREATE TABLE IF NOT EXISTS article_slug_redirects (
  old_slug TEXT PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
