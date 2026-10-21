#!/usr/bin/env bash
set -euo pipefail

# Create or update the database tables first.
pnpm --filter @srh/api db:migrate

# Start the API on Render's assigned port.
API_PORT="${PORT:-10000}" node apps/api/dist/main.js &
API_PID=$!

# Start the publishing and revalidation worker.
node apps/api/dist/worker.js &
WORKER_PID=$!

# Stop both processes together if either one exits.
cleanup() {
  kill "$API_PID" "$WORKER_PID" 2>/dev/null || true
  wait "$API_PID" "$WORKER_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

wait -n "$API_PID" "$WORKER_PID"
