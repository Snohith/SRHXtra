-- 001_init: core editorial schema (Step 2).
-- Tables: roles, users, user_roles, categories, articles,
--         article_revisions, media_assets, audit_logs.
-- Statuses (MVP): DRAFT -> IN_REVIEW -> PUBLISHED (forward only).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Updated-at helper -------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Roles -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (name IN ('admin', 'editor', 'writer', 'publisher')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (staff identity) --------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Categories --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Articles ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt TEXT,
  body TEXT NOT NULL CHECK (char_length(body) >= 1),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'IN_REVIEW', 'PUBLISHED')),
  author_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT articles_publish_consistency CHECK (
    (status = 'PUBLISHED' AND published_at IS NOT NULL) OR
    (status IN ('DRAFT', 'IN_REVIEW') AND published_at IS NULL)
  )
);
DROP TRIGGER IF EXISTS articles_set_updated_at ON articles;
CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS articles_status_published_idx
  ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_category_idx ON articles (category_id);
CREATE INDEX IF NOT EXISTS articles_author_idx ON articles (author_id);

-- Article revisions (previous versions) -----------------------------------
CREATE TABLE IF NOT EXISTS article_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version >= 1),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, version)
);
CREATE INDEX IF NOT EXISTS article_revisions_article_idx
  ON article_revisions (article_id, version DESC);

-- Media assets ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  alt_text TEXT,
  uploaded_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log (append-only admin actions) -----------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx
  ON audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);

-- Seeds -------------------------------------------------------------------
INSERT INTO roles (name) VALUES ('admin'), ('editor'), ('writer'), ('publisher')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (slug, name, description) VALUES
  ('news', 'News', 'Breaking news, transfers, squad updates and announcements'),
  ('match-reports', 'Match Reports', 'Match coverage, scorecards and post-match analysis'),
  ('squad-updates', 'Squad Updates', 'Injuries, availability, retentions and auction news'),
  ('analysis', 'Analysis', 'Tactical breakdowns, opinion and long-form editorial content')
ON CONFLICT (slug) DO NOTHING;

-- Default local-dev staff user so drafts have an author before real auth lands.
INSERT INTO users (id, email, display_name, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@srh.local', 'SRH Admin', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM roles WHERE name = 'admin'
ON CONFLICT DO NOTHING;
