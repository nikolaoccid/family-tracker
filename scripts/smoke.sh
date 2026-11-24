#!/usr/bin/env bash
# End-to-end smoke test against a real Postgres, no Docker.
#   scripts/smoke.sh            start DB, migrate, seed, boot the built app, run flows, tear down
# Exit code is non-zero if any flow returns an unexpected status.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${SMOKE_PORT:-3299}"
export DATABASE_URL="$(node scripts/db.mjs url)"
export DATABASE_DISABLE_SSL=true NODE_ENV=test PORT LOG_LEVEL=warn CORS_ORIGINS=
export SESSION_SECRET=smoke-session-secret-0000 JWT_SECRET=smoke-jwt-secret-000000 JWT_MAIL_SECRET=smoke-mail-secret-00000
export MAIL_HOST=localhost MAIL_PORT=1025 MAIL_USER=smoke MAIL_PASS=smoke MAIL_FROM=smoke@example.com
export STRIPE_SECRET_KEY=sk_test_smoke STREAM_API_KEY=smoke STREAM_API_SECRET=smoke

npm run db:up -- --seed >/dev/null
npm run build >/dev/null
node dist/main >/tmp/family-tracker-smoke.log 2>&1 &
APP=$!
cleanup() { kill "$APP" 2>/dev/null || true; wait "$APP" 2>/dev/null || true; }
trap cleanup EXIT

for _ in $(seq 1 30); do curl -fs "localhost:$PORT/health" >/dev/null && break; sleep 1; done
BASE_URL="http://localhost:$PORT" node scripts/smoke.mjs --seeded >"${SMOKE_OUT:-/dev/null}"
echo "smoke ok"
