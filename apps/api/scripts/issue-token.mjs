/**
 * Issue (or rotate) a staff member's admin API credential.
 *
 * Usage: pnpm --filter @srh/api staff:token <staff-email>
 * Env: DATABASE_URL; STAFF_TOKEN to choose a token (default: random 32 bytes).
 *
 * Only the SHA-256 hash is stored. The token is printed once.
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm --filter @srh/api staff:token <staff-email>");
  process.exit(1);
}

const token = process.env.STAFF_TOKEN ?? randomBytes(32).toString("hex");
const hash = createHash("sha256").update(token).digest("hex");
const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://srh:srh_dev_password@localhost:5432/srh_news",
});

try {
  const { rows } = await pool.query(
    "UPDATE users SET api_token_hash = $1 WHERE lower(email) = lower($2) RETURNING email",
    [hash, email],
  );
  if (rows.length === 0) {
    console.error(`No staff user found for ${email}.`);
    process.exit(1);
  }
  console.log(`Token for ${rows[0].email} (shown once): ${token}`);
} finally {
  await pool.end();
}
