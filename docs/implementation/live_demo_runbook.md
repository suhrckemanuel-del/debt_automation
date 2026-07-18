# Live Demo Deploy Runbook — Single Container (Option 1)

**Scope:** Deploy the synthetic covenant-model demo as one self-hostable
container to a container host (Render / Railway / Fly.io). Authorized by
[`live_demo_deploy_and_scope_change.md`](./live_demo_deploy_and_scope_change.md)
(APPROVED 2026-07-18, Option 1). Synthetic data only. No LLM/API integration.

> **Who runs what.** Every step in this runbook that touches a hosting account,
> a secret, a domain, or a credential is **Manuel's to run** — they are all
> marked **[MANUEL — account/secret]**. The agent prepared the build artifacts
> (`Dockerfile`, `deploy/docker-entrypoint.sh`, `docker-compose.yml`,
> `.dockerignore`, `.env.example`) but never holds credentials and never runs a
> cloud deploy.

---

## 0. What ships

- One image, two processes: the deterministic Python engine (internal,
  `127.0.0.1:8765`) and the Next.js production server (public, `$PORT`).
- SQLite on a **persistent volume** at `/app/apps/web/.data`. Seeded with the
  synthetic Facility A manifest on first boot.
- No real data, no external API calls, no model tokens. Every screen shows
  "Synthetic demo — no real data."

---

## 1. Local smoke test first (no account needed)

Run it locally exactly as it will run in the cloud:

```bash
docker compose up --build
# open http://localhost:3000/dashboard
```

Confirm the demo loop by hand:
1. Dashboard shows the LTV position on the Test Date (2026-06-30): LTV 71.00%,
   threshold 70.00%, headroom −1.00 pp.
2. Evidence cites document, clause/section, page, exact passage.
3. Change the evaluation date to `2026-04-01` (e.g. `/dashboard?asOf=2026-04-01`)
   → original 65.0% threshold shown; abstention preserved where support is
   missing.
4. Download the Excel verification pack; it opens clean.

Reset to a pristine demo any time:

```bash
docker compose down -v   # -v drops the volume (all seeded/saved state)
docker compose up --build
```

Stop:

```bash
docker compose down
```

---

## 2. Environment variables

All variables have in-image demo defaults (see [`.env.example`](../../.env.example)).
For a managed host you typically only set `PORT` if the platform injects its
own, and otherwise leave the defaults. Do **not** add any secret — there are
none.

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | Public web port. Some hosts inject this automatically. |
| `AGREEMENT_ENGINE_PORT` | `8765` | Internal only; never expose it. |
| `AGREEMENT_DATA_BACKEND` | `sqlite` | Only value supported. |
| `AGREEMENT_SQLITE_PATH` | `/app/apps/web/.data/agreement-intelligence.db` | Must live inside the mounted volume. |
| `AGREEMENT_ALLOW_SYNTHETIC_SEED` | `true` | Seeds the synthetic manifest. |
| `AGREEMENT_SYNTHETIC_MANIFEST` | `/app/workspaces/demo/manifest.json` | Tracked synthetic manifest. |
| `AGREEMENT_ENGINE_API_URL` | `http://127.0.0.1:8765` | Web→engine bridge (localhost). |

**The volume is required.** Without a persistent volume mounted at
`/app/apps/web/.data`, saved state is lost on restart (the demo still works —
it re-seeds — but "saved answer" history resets).

---

## 3. Deploy — Render

**[MANUEL — account/secret] All steps below require a Render account.**

1. Push this branch to a Git remote Render can read. **[MANUEL — account/secret]**
2. Render → **New → Web Service** → connect the repo/branch.
3. Environment: **Docker** (Render uses the root `Dockerfile` automatically).
4. Instance type: the smallest paid tier that allows a **persistent disk**
   (the free tier has an ephemeral filesystem).
5. **Add a Disk:** mount path `/app/apps/web/.data`, size 1 GB. **[MANUEL]**
6. Environment variables: leave defaults; do not set `PORT` (Render injects it,
   and the entrypoint honors it).
7. Health check path: `/dashboard`.
8. Create the service; wait for the build + first boot (first boot seeds the DB).
9. **Access control (unlisted):** put the service behind auth. Render does not
   offer built-in Basic Auth on the service itself, so either:
   - keep the URL unlisted and share privately, and/or
   - front it with Cloudflare Access / an allowlist. **[MANUEL — account/secret]**

---

## 4. Deploy — Railway

**[MANUEL — account/secret] Requires a Railway account.**

1. Railway → **New Project → Deploy from Repo** → pick this branch. **[MANUEL]**
2. Railway detects the `Dockerfile` and builds it.
3. **Add a Volume** mounted at `/app/apps/web/.data`. **[MANUEL]**
4. Variables: leave defaults. Railway provides `PORT`; the entrypoint uses it.
5. Networking → **Generate Domain** for a public URL.
6. **Access control:** Railway has no built-in Basic Auth; keep the domain
   unlisted and/or front with an allowlist/proxy. **[MANUEL — account/secret]**

---

## 5. Deploy — Fly.io

**[MANUEL — account/secret] Requires a Fly account and `flyctl` authenticated.**

1. `fly launch --no-deploy` in the repo root; accept the detected `Dockerfile`.
   Do **not** add a Postgres database when prompted. **[MANUEL]**
2. Create a volume (same region as the app): **[MANUEL]**
   ```bash
   fly volumes create demo_data --size 1
   ```
3. In `fly.toml`, mount it and set the internal port:
   ```toml
   [[mounts]]
     source = "demo_data"
     destination = "/app/apps/web/.data"

   [http_service]
     internal_port = 3000
     force_https = true
   ```
4. Deploy: `fly deploy`. **[MANUEL]**
5. **Access control:** front with Fly's built-in options or an allowlist/proxy,
   or keep the `*.fly.dev` URL unlisted. **[MANUEL — account/secret]**

---

## 6. After deploy — verify on the live URL

Repeat the §1 by-hand loop against the deployed URL. Confirm:
- Every page shows the synthetic-demo badge.
- No console errors; the Excel pack downloads and opens clean.
- Changing the date to `2026-04-01` yields the 65.0% original threshold and
  abstention is preserved.

---

## 7. Access model (required before sharing)

Per the approved scope record, the URL must be **unlisted and, ideally, behind a
password or email allowlist** so it is not publicly indexable. **[MANUEL —
account/secret]** Pick one:
- Cloudflare Access (email allowlist) in front of the host — recommended.
- A reverse proxy with HTTP Basic Auth.
- At minimum, share the unlisted URL privately and never link it publicly.

---

## 8. Cost / lifecycle

- Smallest paid tier with a persistent disk; can sleep on idle where the host
  supports it.
- Fully reversible: delete the service and the volume. No data migration; the
  repository is unaffected; no confidential data is ever handled.

---

## Boundaries (unchanged)

- Synthetic data only; no exposed real-document upload path.
- Deterministic engine authoritative; zero LLM/API/token use.
- No claims of adoption, accuracy, time saved, deployment maturity, or
  commercial validation.
- The agent prepares artifacts; **Manuel** runs every account/secret/deploy step.
