#!/usr/bin/env bash
#
# Single-container supervisor for the synthetic covenant-model demo.
#
# Starts the deterministic Python engine (localhost-internal) and the Next.js
# production server in one container, seeds the synthetic SQLite database on
# first run, and fails the whole container if either process dies. Synthetic
# data only — no LLM/API calls, no external network dependency at runtime.
#
set -euo pipefail

# --- Configuration (all env-overridable; demo defaults below) ----------------
: "${PORT:=3000}"                       # Public Next.js port
: "${AGREEMENT_ENGINE_PORT:=8765}"      # Internal Python engine port (localhost)
: "${AGREEMENT_DATA_BACKEND:=sqlite}"   # Only sqlite is implemented
: "${AGREEMENT_SQLITE_PATH:=/app/apps/web/.data/agreement-intelligence.db}"
: "${AGREEMENT_ALLOW_SYNTHETIC_SEED:=true}"
: "${AGREEMENT_SYNTHETIC_MANIFEST:=/app/workspaces/demo/manifest.json}"
: "${AGREEMENT_ENGINE_API_URL:=http://127.0.0.1:${AGREEMENT_ENGINE_PORT}}"
: "${ENGINE_HEALTH_TIMEOUT:=60}"        # Seconds to wait for engine /health

export PORT AGREEMENT_ENGINE_PORT AGREEMENT_DATA_BACKEND AGREEMENT_SQLITE_PATH \
  AGREEMENT_ALLOW_SYNTHETIC_SEED AGREEMENT_SYNTHETIC_MANIFEST AGREEMENT_ENGINE_API_URL

echo "[entrypoint] Synthetic demo — no real data. Deterministic engine only; zero LLM/API calls."
echo "[entrypoint] web port=${PORT} engine port=${AGREEMENT_ENGINE_PORT} db=${AGREEMENT_SQLITE_PATH}"

mkdir -p "$(dirname "${AGREEMENT_SQLITE_PATH}")"

ENGINE_PID=""
WEB_PID=""

shutdown() {
  # Kill whichever child is still alive so the container exits cleanly.
  [ -n "${ENGINE_PID}" ] && kill "${ENGINE_PID}" 2>/dev/null || true
  [ -n "${WEB_PID}" ] && kill "${WEB_PID}" 2>/dev/null || true
}
trap shutdown EXIT INT TERM

# --- 1. Start the deterministic engine (binds 127.0.0.1 only) ----------------
/app/.venv/bin/python /app/app.py api --port "${AGREEMENT_ENGINE_PORT}" &
ENGINE_PID=$!
echo "[entrypoint] engine started (pid ${ENGINE_PID})"

# --- 2. Wait for the engine to report healthy --------------------------------
healthy=0
for _ in $(seq 1 "${ENGINE_HEALTH_TIMEOUT}"); do
  if curl -fsS "http://127.0.0.1:${AGREEMENT_ENGINE_PORT}/health" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  if ! kill -0 "${ENGINE_PID}" 2>/dev/null; then
    echo "[entrypoint] FATAL: engine exited before becoming healthy" >&2
    exit 1
  fi
  sleep 1
done
if [ "${healthy}" -ne 1 ]; then
  echo "[entrypoint] FATAL: engine did not become healthy within ${ENGINE_HEALTH_TIMEOUT}s" >&2
  exit 1
fi
echo "[entrypoint] engine healthy"

# --- 3. First-run seed (idempotent; non-fatal fallback to lazy base seed) ----
# On a fresh volume the database file does not yet exist. Run the deterministic
# reset, which seeds the synthetic manifest and replays the canonical answer /
# covenant-calculation history through the live engine so the activity feed is
# populated. On restarts the file already exists and this is skipped, preserving
# anything a reviewer saved. If the reset fails, the web app still lazily seeds
# base state on first request, so the core workflow remains available.
if [ ! -f "${AGREEMENT_SQLITE_PATH}" ]; then
  echo "[entrypoint] first run: seeding synthetic demo database"
  if ( cd /app/apps/web && node node_modules/tsx/dist/cli.mjs scripts/demo-reset.ts ); then
    echo "[entrypoint] synthetic demo database seeded"
  else
    echo "[entrypoint] WARNING: demo-reset failed; falling back to lazy base seed" >&2
  fi
else
  echo "[entrypoint] existing database found; skipping seed"
fi

# --- 4. Start the Next.js production server ----------------------------------
( cd /app/apps/web && exec node node_modules/next/dist/bin/next start -p "${PORT}" -H 0.0.0.0 ) &
WEB_PID=$!
echo "[entrypoint] web started (pid ${WEB_PID})"

# --- 5. Supervise: exit (and take the container down) if either dies ---------
wait -n "${ENGINE_PID}" "${WEB_PID}"
status=$?
echo "[entrypoint] a supervised process exited (status ${status}); shutting down container" >&2
exit "${status}"
