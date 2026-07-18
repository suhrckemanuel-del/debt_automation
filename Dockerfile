# Single-container synthetic covenant-model demo.
#
# One image runs BOTH:
#   - the deterministic Python engine (localhost:8765, internal only), and
#   - the Next.js production server (next start, exposed on $PORT, default 3000).
#
# Synthetic data only. No LLM/API/vector-DB calls; no external network needed at
# runtime. SQLite persists to a mounted volume at /app/apps/web/.data.
#
# Base image carries Node 22 (Debian bookworm) and Python 3.11, matching the
# locally-verified runtime to minimise behaviour drift.

FROM node:22-bookworm

ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NEXT_TELEMETRY_DISABLED=1

# --- System + Python engine dependencies -------------------------------------
# build-essential + python3 are needed to compile the better-sqlite3 native
# addon during `npm ci`. curl is used by the container health check and the
# entrypoint's engine readiness probe.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       python3 python3-venv python3-pip build-essential curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Isolated venv for the engine's only third-party deps (stdlib + these two).
RUN python3 -m venv /app/.venv \
  && /app/.venv/bin/pip install --no-cache-dir "pypdf>=5.0" "openpyxl>=3.1"

# --- Web dependencies (cached layer) -----------------------------------------
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN cd apps/web && npm ci

# --- Application source -------------------------------------------------------
COPY . .

# --- Production build ---------------------------------------------------------
# build:synthetic supplies the synthetic env the build expects and writes an
# ephemeral build-check DB (not the runtime volume).
RUN cd apps/web && npm run build:synthetic \
  && rm -rf /app/apps/web/.data

# Runtime volume for the synthetic SQLite database.
VOLUME ["/app/apps/web/.data"]

ENV PORT=3000 \
    AGREEMENT_ENGINE_PORT=8765 \
    AGREEMENT_DATA_BACKEND=sqlite \
    AGREEMENT_SQLITE_PATH=/app/apps/web/.data/agreement-intelligence.db \
    AGREEMENT_ALLOW_SYNTHETIC_SEED=true \
    AGREEMENT_SYNTHETIC_MANIFEST=/app/workspaces/demo/manifest.json \
    AGREEMENT_ENGINE_API_URL=http://127.0.0.1:8765

EXPOSE 3000

# Both services must answer for the container to be healthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${AGREEMENT_ENGINE_PORT}/health" >/dev/null \
   && curl -fsS "http://127.0.0.1:${PORT}/dashboard" >/dev/null || exit 1

# Normalise line endings defensively (a CRLF shebang breaks in Linux) and mark
# the supervisor executable.
RUN sed -i 's/\r$//' /app/deploy/docker-entrypoint.sh \
  && chmod +x /app/deploy/docker-entrypoint.sh
ENTRYPOINT ["/app/deploy/docker-entrypoint.sh"]
