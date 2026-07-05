# F-001 / F-002 Threat Model

**Status: DRAFT — NOT APPROVED**

This draft exists so that Gate 1 (real-document authorization) cannot be
approved without a reviewed threat model. It has not been reviewed or
approved by the owner. It describes the system as of 5 July 2026, running
synthetic data only, and lists the threats that must be mitigated **before**
any real or confidential document is processed.

## Current data flow (synthetic-only)

1. **Tracked synthetic corpus** — `docs/phase-1/synthetic-corpus/*.md`
   (5 documents: facility agreement, amendment letter, waiver letter, loan
   balance statement, valuation certificate). All fictional.
2. **Python engine** (`src/agreement_intelligence/`) — deterministic parsing,
   provision mapping, hierarchy resolution, LTV calculation
   (`financial_model.py`), citation validation. Runs locally.
3. **Engine API** (`app.py api`, default `127.0.0.1:8765`) — versioned local
   HTTP contract (`contracts/engine-api.openapi.yaml`, v1.2.0). Binds to
   loopback only.
4. **Web shell** (`apps/web`) — Next.js reading a local SQLite database
   (`.data/`, Git-ignored) seeded only when
   `AGREEMENT_ALLOW_SYNTHETIC_SEED=true`, and calling the loopback engine
   API. No authentication (local, single-user, synthetic).
5. **Pilot workspaces** (`workspaces/`) — Git-ignored except the synthetic
   `workspaces/demo`. Intended future location for approved local documents.
6. **Hosted schema** (`supabase/migrations/`) — versioned but **not
   deployed**. No cloud credentials exist in the repository.

## Trust boundaries

- **B1: Repository ↔ workspaces.** Everything tracked in Git must be
  synthetic. Real documents (never yet present) must exist only in
  Git-ignored workspaces.
- **B2: Document content ↔ engine.** Imported document text is untrusted
  data. It must never be executed, evaluated, or treated as instructions.
- **B3: Engine API ↔ web shell.** The web shell trusts the loopback engine
  contract. Neither is exposed off-host.
- **B4: Machine output ↔ human decision.** Every calculation and answer is a
  proposal; only a human reviewer may accept it. `human_review_required` and
  typed abstentions enforce this boundary in the contract.
- **B5: Local machine ↔ everything else.** No cloud, no LLM, no external
  provider is authorized. Any network egress carrying document content is a
  boundary violation today.

## Threats and current posture

Severity assumes the future real-document context; "OK (synthetic)" means
the risk is currently immaterial only because all data is synthetic.

| # | Threat | Current posture | Required before Gate 1 |
|---|--------|-----------------|------------------------|
| T1 | Malicious upload (crafted PDF/DOCX) | Markdown/PDF import exists for local workspaces; no signature/MIME/size validation gauntlet | Quarantined intake: extension, MIME, file-signature, size, page-count, encryption checks; reject-or-quarantine, never silent skip |
| T2 | Parser exploits | Parsers run in-process with user privileges | Sandbox or isolate high-risk parsers; resource, page, and time limits |
| T3 | Decompression bombs / oversized files | No limits enforced | Size and decompression limits at intake |
| T4 | Active content / macro-enabled files | Not applicable to current markdown corpus | Reject macro-enabled formats at intake allowlist |
| T5 | Indirect prompt injection via document text | No LLM exists (Gate 3 closed); document text is data-only in the deterministic engine | Keep B2; if an LLM is ever authorized, treat document content as untrusted and add an injection/exfiltration review (Gate 3) |
| T6 | Data exfiltration via egress | No external providers; engine binds to loopback | Egress controls and provider approval before any external call |
| T7 | Broken object authorization | Web tests cover foreign-actor document access (`document detail fails safely for unknown ids and foreign actors`) | Authenticate and authorize every resource request once multi-user |
| T8 | Cross-tenant/workspace retrieval | Workspace isolation enforced in persistence layer; cross-workspace test exists in web suite | Isolation tests at storage, query, cache, index, and export layers |
| T9 | Poisoned retrieval index | No vector/semantic index exists | Keep any future index a replaceable derivative; authorization filters before retrieval |
| T10 | Privilege escalation | Single local user; no roles yet | Role model, least privilege, MFA per Gate 1 decisions |
| T11 | Insecure exports | Export requires reviewer approval by contract; no bulk export | Export controls and audit per Gate 1 |
| T12 | Confidential data in logs | Engine logs request lines only; test output synthetic. Not yet verified against a redaction policy | Redaction policy plus a leak test before real data |
| T13 | Stale sessions | No sessions exist (no auth) | Session controls per Gate 1 |
| T14 | Vulnerable dependencies | `package-lock.json` pins the web stack; Python depends on `pypdf>=5.0` (a PDF parser — see T2), floor-versioned rather than pinned | Pin and scan dependencies, including `pypdf`, before real documents reach any parser |
| T15 | Insider access | Single-owner machine | Audit trail (append-only) and accountability per Gate 1 |
| T16 | Lost keys | No encryption keys exist yet | Key ownership/rotation/recovery decisions at Gate 1 |
| T17 | Incomplete deletion (derivatives, caches, indexes, backups) | SQLite derivative store exists; deletion propagation not yet verified end-to-end | Verified deletion test including derivatives and documented backup expiry |
| T18 | Compromised backups | No backups of workspace data exist | Backup encryption, restore tests, deletion propagation |

## Misuse cases

- A user pastes a real agreement into the synthetic web UI. Mitigation
  today: instructions and README boundary; no technical control. Before Gate
  1: intake path with explicit authorization checks, plus training and a
  prohibited-use policy.
- A reviewer treats the LTV calculator output as a compliance conclusion.
  Mitigation: `human_review_required` is always true; the contract never
  emits breach/compliance conclusions; review note names the human-only
  judgments.
- An agent or script commits workspace content. Mitigation: `.gitignore` on
  `workspaces/` (except demo); repository rule that approved pilot documents
  must never be committed.

## Explicit non-claims

- Locality alone does not make the system secure.
- Encryption alone does not solve confidentiality.
- The absence of an LLM eliminates prompt-injection risk only for as long as
  Gate 3 remains closed; the boundary must be re-reviewed at Gate 3.

## Review

- OWNER DECISION REQUIRED — Review and approve or amend this threat model
  before Gate 1 approval.
