# Live Demo — Deploy Plan, Scope-Change Record, and Security Framing

**Status: APPROVED — 2026-07-18. Manuel approved lifting "no cloud deployment" ONLY for a synthetic-only demo. Chosen deploy shape: Option 1 (single self-hostable container, transferable to Render/Railway/Fly.io). LLM/API integration remains DEFERRED and out of scope (Part D).**
**Author prepared: 2026-07-18. Standing boundary changed by this record: "no cloud deployment" (AGENTS.md / orchestrator non-negotiables), narrowed to permit a synthetic-only hosted demo. All other non-negotiables stand unchanged.**

This document exists because the owner wants a live, hostable demo a real reviewer can click and try ("here's what I've been working on — tell me what you think"). That crosses a boundary the project set on purpose. This record makes the change honest, traceable, and reversible.

**Approval note (2026-07-18):** Option 1 selected for lowest behaviour drift from the locally-verified build. Build artifacts (Dockerfile, entrypoint, compose, runbook) are prepared in-repo; the deploy itself, hosting accounts, and all secrets remain Manuel's — the agent never runs them. See [`live_demo_runbook.md`](./live_demo_runbook.md) and [`live_demo_handoff_checklist.md`](./live_demo_handoff_checklist.md).

---

## Part A — Deploy plan (verified against current architecture)

### What actually runs today
- **Next.js app** (`apps/web`, port 3000) — server actions call the Python engine over HTTP via `AGREEMENT_ENGINE_API_URL`, and persist to a data backend.
- **Python engine** (`app.py api --port 8765` → `serve_engine_api` in `src/agreement_intelligence/api.py`) — a **stateless standard-library HTTP server**. It builds `AgreementIntelligenceEngine(root)`, reads the **read-only synthetic corpus + manifest** from disk, and computes. **No database.** Dependencies: stdlib + `openpyxl` + `pypdf`.
- **Persistence** — only the **SQLite** backend is implemented (`apps/web/src/lib/persistence/config.ts` throws for any other value). A Postgres/Supabase **schema exists** (`/supabase/migrations/*.sql`) but **no TypeScript adapter is written yet**. SQLite writes to a local file, which does **not** survive a serverless/ephemeral filesystem.

### The two real constraints for hosting
1. **Split runtime:** a Node app + a long-running Python service. Vercel hosts Node natively; a persistent Python server is not a native Vercel shape.
2. **Stateful writes:** saved answers / model runs / workspaces go to SQLite-on-disk. Any host with an ephemeral filesystem needs either a persistent volume or a hosted DB (Postgres adapter — currently unwritten).

### Options, ranked

**Option 1 — Single container on Render / Railway / Fly.io (recommended for speed + fidelity).**
Bundle Next.js + the Python engine (one image or a two-service project), SQLite on a small persistent volume so writes survive. This is the **closest match to the locally-verified setup**, so the lowest risk of behavior drift from what we already checked against live tools. Produces a real URL. Effort: moderate. Not Vercel, but the honest fastest path.

**Option 2 — Vercel + Supabase (the "modern stack" portfolio story).**
Next.js on Vercel; the engine as **Vercel Python serverless functions** (the routes are stdlib and portable, but need wrapping and cold-start consideration); persistence via **Supabase Postgres** — which requires **writing the Postgres persistence adapter** (schema already in `/supabase/migrations`). Effort: higher, more moving parts, more surface for drift. Payoff: a clean "Vercel + Supabase" narrative if that matters for the portfolio.

**Option 3 — Read-only synthetic demo (leanest infra).**
Scope the demo to the read paths (`/dashboard`, `/models`, evidence, **Download verification pack**) with the synthetic manifest seeded at build and **writes disabled** (no saved-answers persistence). No database needed at all. Deploy Next.js on Vercel + engine as serverless functions. Effort: lowest. Trade-off: loses "save an answer" interactivity, but keeps the whole covenant-model + Excel-pack showcase — which is the actual proof.

### Recommendation
For "send the guy a link soon," **start with Option 1** (least drift from the verified build). If the Vercel+Supabase story is specifically wanted for the portfolio, do **Option 2** and budget the adapter work. **Option 3** is the fallback if we want the simplest possible thing that still shows the covenant model and the downloadable pack.

**In every option:** I can prepare the Dockerfile / serverless wrappers / Postgres adapter / config, but the **deploy itself, the hosting accounts, and any secrets are yours** — I will not handle credentials or API keys.

---

## Part B — Scope-change decision record (APPROVED 2026-07-18)

**Decision (approved):** Lift the "no cloud deployment" boundary **only** for a **synthetic-only** demo reachable by URL. Nothing else changes.

**Stays fixed (unchanged non-negotiables):**
- Synthetic data only. No real agreements, entity names, deal terms, credentials, or non-public information — ever, on the hosted demo.
- The deterministic engine stays authoritative; **no LLM/API integration in this phase** (that is a separate decision — see Part D).
- Every factual answer cited to document, clause, page, passage. Abstention preserved. Original terms, amendments, and waivers kept distinct.
- Human legal/commercial/compliance/investment judgment retained.
- No claims of adoption, accuracy in the field, time saved, deployment maturity, or commercial validation.

**Risks & mitigations:**
- *A public URL is mistaken for a product, or receives real data.* → Synthetic-only labelling on every screen; no real-document upload path exposed; unlisted URL behind a password or allowlist.
- *Behavior drift between the locally-verified build and the cloud build.* → Prefer Option 1 (matched runtime); re-run the live-tool checks against the deployed URL before sharing.
- *Always-on exposure / cost.* → Minimal; synthetic; can be a sleep-on-idle instance.

**Reversibility:** Fully reversible. Take the deployment down; there is no data migration and the repository is unaffected. No confidential data is ever placed at risk because none is handled.

**Explicitly out of scope of this record:** LLM/API integration, and any real-document ingestion (still prohibited).

---

## Part C — Security & confidentiality framing (for the "he tries it" ask)

The prospect's #1 adoption blocker on record is **data confidentiality**. The demo addresses it the strongest possible way: **by handling no confidential data at all.**

- **The demo is a synthetic sandbox.** It ships with Facility A synthetic documents. There is no reason, and no exposed path, to put real company documents into it.
- **If the reviewer says "let me try it on ours" — stop.** That is a separate, serious conversation (zero-retention / on-prem processing, no third-party API on confidential text, contractual data terms). Do not let real documents touch the synthetic demo casually. This is exactly where the confidentiality objection bites, so name it before he does.
- **Access:** share an **unlisted URL, ideally behind a simple password or email allowlist**, so it is not publicly indexable. Every screen reads "Synthetic demo — no real data."
- **Honesty in the pitch:** it is a working prototype on synthetic data. No claims that it is production, accurate in the field, adopted, or validated. The "tell me what you think" framing is honest and correct.

### Draft message to send (sanitized, no overclaim)
> Hey — I've been building a small tool for one narrow credit-review task: establishing the current LTV covenant position across an agreement, an amendment, and a limited waiver, with every number traced to the exact clause and page, and an Excel verification pack you can check by hand.
>
> It runs entirely on **synthetic sample documents** — please don't put anything real or confidential into it; that's a separate conversation. I'd love a brutally honest reaction: does this match how you'd actually establish that position, where does it save or add work, and what would make it genuinely useful? Here's the link: [URL]. No rush, and no pressure — I'm looking for the honest version, including "this isn't useful."

---

## Part D — The LLM/API question (deferred, noted for the record)

The owner raised building "with API calls." That is a **larger, separate decision**, deliberately not folded into this plan, because it can undercut the asset's core edge (deterministic, cited, no hallucination — the exact pitch a finance skeptic trusts).

If pursued later, the **only** honest shape is: an LLM **proposes** candidate passages/values from a **synthetic** document, and a human **confirms** before anything becomes authoritative — "AI-assisted extraction, deterministic verification." It must never be the authoritative answer, must keep citation + abstention discipline, and — because sending confidential text to a third-party API is the confidentiality blocker itself — must stay on synthetic data in any shared demo. This needs its own decision record, an API key you provide, and its own security review.

---

## Approval checklist (for Manuel)
- [x] Approve lifting "no cloud deployment" for a **synthetic-only** demo (Part B). — Approved 2026-07-18.
- [x] Choose a deploy option: **1 (container)** / ~~2 (Vercel+Supabase)~~ / ~~3 (read-only)~~. — **Option 1 chosen.**
- [ ] Confirm access model (unlisted URL + password/allowlist). — To be set by Manuel at deploy time; see runbook.
- [x] Confirm LLM/API stays **out** for now (Part D deferred). — Confirmed out of scope.
- [x] On approval, agent prepares deploy artifacts; **Manuel** runs the deploy and holds all secrets. — Artifacts prepared 2026-07-18.
