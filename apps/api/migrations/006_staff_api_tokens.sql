-- 006_staff_api_tokens: one hashed API credential per staff member.
--
-- Admin requests present only the token; the API resolves the actor from its
-- hash. The client can no longer name the user it wants to act as.
-- Issue/rotate a token with:
--   pnpm --filter @srh/api staff:token <email>

ALTER TABLE users ADD COLUMN IF NOT EXISTS api_token_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_api_token_hash_idx
  ON users (api_token_hash)
  WHERE api_token_hash IS NOT NULL;
