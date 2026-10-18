-- 004_workflow: editorial workflow v2 — archive/unpublish, scheduled
-- publishing, and review notes.
--
-- Status machine:
--   DRAFT -> IN_REVIEW -> (PUBLISHED | SCHEDULED -> PUBLISHED)
--   PUBLISHED / DRAFT / IN_REVIEW / SCHEDULED -> ARCHIVED
--   ARCHIVED -> DRAFT (restore)
--
-- The reliability pipeline is unchanged: every public-facing change commits
-- a revision + audit row + outbox event in ONE transaction
-- (article.published / article.updated / article.archived).

-- Columns first (constraints below reference them) -------------------------
ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS review_note TEXT
  CHECK (review_note IS NULL OR char_length(review_note) BETWEEN 1 AND 1000);

-- Statuses ------------------------------------------------------------------
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE articles ADD CONSTRAINT articles_status_check
  CHECK (status IN ('DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'));

-- PUBLISHED requires published_at; SCHEDULED requires scheduled_for and must
-- not have published_at; ARCHIVED keeps whatever history it had (a story
-- archived after publishing keeps its published_at; a discarded draft stays
-- NULL).
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_publish_consistency;
ALTER TABLE articles ADD CONSTRAINT articles_publish_consistency CHECK (
  (status = 'PUBLISHED' AND published_at IS NOT NULL) OR
  (status = 'SCHEDULED' AND published_at IS NULL AND scheduled_for IS NOT NULL) OR
  (status IN ('DRAFT', 'IN_REVIEW') AND published_at IS NULL) OR
  (status = 'ARCHIVED')
);

-- The worker scans due scheduled articles; keep that lookup cheap.
CREATE INDEX IF NOT EXISTS articles_scheduled_idx
  ON articles (scheduled_for)
  WHERE status = 'SCHEDULED';
