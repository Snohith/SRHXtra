-- 003_reliability: transactional outbox, worker heartbeat, signed uploads.
--
-- The outbox pattern makes "publish" atomic and reliable:
-- article update + revision + audit + outbox event commit in ONE transaction;
-- the worker picks events up with SKIP LOCKED and triggers web revalidation.
-- If the worker or web is down, events stay PENDING and are retried with backoff.

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts >= 1),
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Claim index: worker scans for due PENDING rows; stale PROCESSING rows get recovered.
CREATE INDEX IF NOT EXISTS outbox_claim_idx
  ON outbox_events (status, available_at)
  WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX IF NOT EXISTS outbox_aggregate_idx
  ON outbox_events (aggregate_type, aggregate_id, created_at DESC);

-- Key/value state (worker heartbeat, future feature flags). Read by /health.
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Signed direct-upload intents: admin signs -> client PUTs to storage ->
-- admin completes -> media_assets row. Binds key, MIME, size cap, and actor.
CREATE TABLE IF NOT EXISTS media_upload_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  max_bytes INTEGER NOT NULL CHECK (max_bytes > 0),
  provider TEXT NOT NULL DEFAULT 'local' CHECK (provider IN ('local', 's3')),
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS media_upload_intents_pending_idx
  ON media_upload_intents (expires_at)
  WHERE completed_at IS NULL;
