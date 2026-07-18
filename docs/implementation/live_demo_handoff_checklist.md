# Live Demo — Transfer / Handoff Checklist

Making the synthetic covenant-model demo clean to hand to a business reviewer.
Pairs with [`live_demo_runbook.md`](./live_demo_runbook.md) and the approved
scope record [`live_demo_deploy_and_scope_change.md`](./live_demo_deploy_and_scope_change.md).

Synthetic data only. Deterministic engine only. No LLM/API. No claims of
adoption, accuracy, time saved, deployment maturity, or commercial validation.

---

## A. Confirm only synthetic data ships

- [ ] Only the synthetic demo workspace is present: `workspaces/demo/manifest.json`
      references source paths under `docs/phase-1/synthetic-corpus/` only.
- [ ] `.dockerignore` excludes `workspaces/*` except `workspaces/demo/`, plus
      any local `.env`, logs, and pilot workspaces — so nothing local leaks into
      the image.
- [ ] No `.env` file is committed or baked into the image; there are no secrets
      (there is nothing secret to hold — no API keys, no cloud credentials).
- [ ] The build seeds from the manifest only; the demo exposes **no
      real-document upload path** (verified: no file-input / upload route in the
      web app).
- [ ] Every page renders the persistent badge: "Synthetic demo — no real data.
      Do not upload real or confidential documents."

## B. Confirm behaviour parity with the verified baseline

- [ ] LTV position on the Test Date (2026-06-30): LTV 71.00%, threshold 70.00%,
      headroom −1.00 pp, debt capacity −€1,000,000.
- [ ] Amendment (70%) and the one-date limited waiver (72%) shown as distinct.
- [ ] Evidence cites document, clause/section, page, exact passage.
- [ ] Evaluation date → `2026-04-01` shows the original 65.0% threshold;
      abstention preserved where support is missing.
- [ ] Excel verification pack downloads, opens clean in real Excel (0 macros,
      no external links, formulas + parity resolve), and is byte-deterministic.

## C. Demo reset (return to a pristine state)

The container seeds a fresh synthetic DB on first boot and re-seeds if the
volume is empty. To reset:

- **Local (compose):**
  ```bash
  docker compose down -v     # drops the volume
  docker compose up --build  # re-seeds synthetic state
  ```
- **Managed host:** delete/recreate the persistent volume (or clear the mount),
  then restart the service; first boot re-seeds. **[Manuel — account action]**
- **Local dev (non-container), from `apps/web`:** `npm run demo:reset` restores
  the synthetic base state and replays the canonical answer / covenant history
  through the engine. Stop the dev server first (SQLite file lock).

The reset is deterministic and refuses any non-synthetic manifest or any
database containing a non-synthetic workspace.

## D. Access + sharing (Manuel)

- [ ] URL is unlisted and behind a password or email allowlist (Cloudflare
      Access / Basic Auth / private share). **[Manuel — account/secret]**
- [ ] The share message names the synthetic-only boundary and asks the reviewer
      **not** to put anything real or confidential into it (draft in the scope
      record, Part C).
- [ ] If the reviewer says "let me try it on ours" — **stop**; that is a
      separate zero-retention / on-prem conversation, not this demo.

## E. What is intentionally NOT in this build (non-goals)

- No LLM / external API / vector DB / chatbot (deferred; scope record Part D).
- No Postgres adapter — SQLite on a volume is the only persistence.
- No real-data ingestion path.
- No production / accuracy / adoption claims anywhere in the UI or copy.

## F. Hand-off contents

- Source branch with: `Dockerfile`, `deploy/docker-entrypoint.sh`,
  `docker-compose.yml`, `.dockerignore`, `.env.example`.
- Runbook: [`live_demo_runbook.md`](./live_demo_runbook.md).
- This checklist.
- Scope/authorization record: [`live_demo_deploy_and_scope_change.md`](./live_demo_deploy_and_scope_change.md).

## G. Known hardening items (optional, before wider exposure)

- Container currently runs as root for volume-write simplicity across hosts;
  a non-root user can be added if a host requires it.
- Put the URL behind an allowlist/proxy (§D) rather than relying on obscurity.
