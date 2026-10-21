-- 008_search_trgm: trigram indexes for the ILIKE search on articles.
--
-- Public and admin search use `%term%` matches against title/excerpt/body;
-- without these, every request scans every row. pg_trgm is in PostgreSQL's
-- contrib modules (the docker-compose database user can create it).
-- If the production DB user cannot CREATE EXTENSION, install pg_trgm as a
-- superuser once and drop the CREATE EXTENSION line.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS articles_title_trgm_idx
  ON articles USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS articles_excerpt_trgm_idx
  ON articles USING gin (excerpt gin_trgm_ops);
CREATE INDEX IF NOT EXISTS articles_body_trgm_idx
  ON articles USING gin (body gin_trgm_ops);
