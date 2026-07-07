# Security Layer — Addressing the Data-Confidentiality Concern

**Why this exists:** the prospect's main adoption blocker (call, 2026-07-07) is information security — "can we even give a system access to all that data?" This layer answers that per demo, *lightly*: the creative concepts stand; each just gains an honest one-paragraph security posture and, for the top 5, a clean phased implementation path where trust is earned stage by stage.

**The core insight that makes this easy:** almost every demo in this catalog was already designed so that **the LLM never computes on the portfolio** — it translates a user's question into parameters, or drafts narrative from engine outputs. That means the sensitive data path and the AI path are naturally separable, and the security answer is mostly *architecture we already chose*, not bolt-on controls.

---

## 1. Sensitivity tiers (used throughout)

| Tier | What it is | Examples | Default posture |
|------|-----------|----------|-----------------|
| **T1 — Structured numbers** | Figures that are meaningless without context and easy to anonymize | Balances, margins, NOI, covenant *levels as numbers*, curves | Anonymize deal names; can live in a pilot dataset with coded IDs |
| **T2 — Commercial terms** | Structured but commercially sensitive; identifies counterparties or negotiated positions | Lender names, prepayment mechanics, covenant definitions, hedge counterparties | Client-side or single-tenant storage; role-based access; never needed by the LLM |
| **T3 — Documents & external comms** | Full agreements, term sheets in live negotiation, anything leaving the building | Facility agreements, lender Q&A responses, investor packs | Requires legal sign-off; strictest handling; avoid in v1 wherever possible |

**The pattern:** the top-scoring demos are T1/T2 by design. The T3-dependent demos (06, 11, 12, 17) sank in the ranking partly for this reason — the credibility scoring quietly did the security triage too.

## 2. The three standing security design rules

Applied to every demo, stated once here, referenced everywhere:

1. **Data/AI separation:** the deterministic engine holds and computes on portfolio data; the LLM sees only (a) the user's own words and (b) aggregated engine outputs explicitly passed for narration. No bulk dataset ever enters a prompt.
2. **Staged trust:** every demo has the same three-stage path — *synthetic demo (zero client data) → pilot (one fund, coded names, structured extract) → production (full data, hardened deployment)*. Nobody approves "access to everything" on day one.
3. **Provable handling:** run manifests (already adopted from the risk critic) double as security audit logs — who ran what, on which data snapshot, when. Zero-retention / no-training terms with the LLM provider; subprocessor list maintained from day one.

## 3. Light security posture — all 20 demos

One line each: what data it needs, its tier, what the LLM sees, and the one-sentence answer to give a prospect.

| # | Demo | Data needed | Tier | LLM sees | One-line security answer |
|---|------|-------------|------|----------|--------------------------|
| 01 | Stress Test Copilot | Structured deal dataset | T1–T2 | Your scenario sentence only | "The AI translates your question; it never touches your portfolio data." |
| 02 | Covenant Headroom Radar | Covenant config + financials | T2 | Aggregated results for narration | "Covenant definitions stay in your environment; drafting works from computed headroom numbers only." |
| 03 | Refi Window Optimizer | Terms + prepayment mechanics | T2 | Nothing (math) / results for memo draft | "All break-cost math is deterministic and can run entirely on your side." |
| 04 | Maturity Wall Monitor | Facility register | T2 | Aggregates for commentary | "Lender names and balances never enter an AI prompt — only the totals you'd put on a slide." |
| 05 | Hedge Coverage Ladder | Hedge + debt registers | T1–T2 | Nothing / narrative | "Pure arithmetic on your registers; runs locally." |
| 06 | Term Sheet Comparator | Live term sheets | **T3** | The documents (extraction) | "Highest-sensitivity demo — needs redaction workflow + legal sign-off; not a v1 candidate for that reason." |
| 07 | Downside Case Generator | Deal models + severity library | T1 | Asset metadata for case selection | "The severity library is ours; your deal data stays in the engine." |
| 08 | Assumption Registry | Scans model files/memos | T2–T3 | File excerpts (detection) | "Scanner can run entirely client-side; only drift flags leave the files." |
| 09 | Breakeven Solver | Deal dataset | T1 | Your question only | Same as 01. |
| 10 | Sensitivity Matrix | Deal dataset | T1 | Nothing (no LLM needed) | "No AI in the loop at all — deterministic grid math." |
| 11 | Lender Q&A Builder | Full dataset + outbound answers | **T3** | Dataset excerpts + drafts leave the building | "External-facing — human approval gate mandatory; late-phase product only." |
| 12 | IC Memo Drafter | Dataset + memo templates | T2–T3 | Slot values + prose drafting | "Figures come from typed slots; the LLM writes connective prose around numbers it can't change." |
| 13 | Early-Warning Flags | Portfolio dataset | T2 | Flag summaries for narration | "Rules-first: flags are computed by explicit thresholds, not AI." |
| 14 | Amortization Auditor | Mechanics + lender statements | T2 | Nothing (deterministic) | "Independent recomputation, fully local — arguably a security *win* (it checks your lender)." |
| 15 | Cash Trap Simulator | Waterfall mechanics | T2 | Nothing / narrative | "Mechanics entered via structured form; state machine is deterministic." |
| 16 | Rate Scenario Pack | Curves + portfolio | T1 | Nothing / narrative | "Curves aren't secret; portfolio math is local." |
| 17 | Reporting Pack Assembler | Full dataset + investor outputs | T2–T3 | Section drafts | "Template-bound figures; drafts watermarked; investor-facing = human sign-off." |
| 18 | Debt Capacity Sizer | Asset financials | T1 | Nothing / narrative | "Single-asset arithmetic; easiest possible data ask." |
| 19 | What-If Chat | Engine API | T1–T2 | Questions + operation results | "The chat can only call engine functions — it has no raw data access by construction." |
| 20 | Release Pricing Analyzer | Release provisions (structured) | T2 | Nothing / narrative | "Provisions entered as structured mechanics, not documents." |

---

## 4. In-depth: security + phased implementation for the Top 5

Format per demo: **what it actually needs / exposure analysis / security talk track / implementation phases.** Phases are clean-cut: each has an entry gate, deliverables, and an exit test. Phase 0 requires **zero** client data by design.

---

### 4.1 Stress Test Copilot

**Minimum data:** facilities, covenants, cash flows, hedges, valuations — all structured numbers and terms (T1–T2). **No documents.**

**Exposure analysis:**
- LLM path: the user's scenario sentence ("rates +200bp, ERV −10%") — contains no portfolio data unless the user types a deal name; deal names can be aliased before the prompt (engine resolves "Meridian" → internal ID; prompt sees the alias).
- Engine path: full dataset — deterministic code, deployable client-side/VPC; never calls out.
- Honeypot concern: the stress dataset is a subset of what already sits in their deal models; the system adds access control and audit logging that the current spreadsheet sprawl *lacks*. Frame it as a net security improvement.

**Security talk track (2 sentences):** *"The AI only ever sees the sentence you typed — translation happens on your words, all computation happens in a deterministic engine that can run inside your environment. Every run is logged with who, what, and which data snapshot, which is more audit trail than any spreadsheet gives you today."*

**Implementation phases:**
- **Phase 0 — Synthetic demo** *(no client data; no approvals needed)*: SynthPort dataset + engine + golden-file tests + confirmation-gate UI. **Exit test:** evaluator checklist passes; prospect has seen the full workflow on labelled synthetic data.
- **Phase 1 — Pilot, one fund** *(entry gate: NDA + data-handling letter; structured extract template agreed)*: client fills a structured extract (coded deal IDs, no lender names required for the math); engine runs in single-tenant instance or client VM; LLM behind zero-retention API terms with alias substitution. **Exit test:** pilot acceptance = the evaluator checklist run on their fund; reconciliation vs their own Excel for 3 deals.
- **Phase 2 — Production** *(entry gate: compliance sign-off using Phase-1 evidence)*: full portfolio; SSO + role-based access (fund-level partitioning); run-manifest audit log surfaced to their risk team; documented subprocessor list; annual review date. **Exit test:** their compliance team can answer "who saw what, when" from the audit log alone.

---

### 4.2 Covenant Headroom Radar

**Minimum data:** covenant definitions/levels (T2 — negotiated terms), projected financials, valuations with as-of dates. **No documents** — definitions arrive as structured config, not extracted clauses.

**Exposure analysis:**
- The sensitive item is the covenant config: it encodes negotiated positions per lender. It lives only in the engine store; the LLM narration receives computed headroom numbers and dates, never the definitions.
- Projection outputs are forward-looking risk statements — internally sensitive (imagine a "watch list" leaking). Mitigation: watch-list access restricted by role; exports carry classification footers.

**Security talk track:** *"Your covenant definitions are entered once as structured config and never leave the engine. The drafting AI sees only the same aggregate numbers you'd put in a quarterly report — and the forward watch list is role-restricted because we know it's the most sensitive page in the product."*

**Implementation phases:**
- **Phase 0 — Synthetic:** SynthPort + projection engine + back-test harness on synthetic history. **Exit:** 3 seeded breaches flagged ≥2 quarters early, ≤2 false positives.
- **Phase 1 — Pilot:** one fund's covenant configs entered via the structured form (their analyst enters them — data never transits to us in raw form); freshness badges live. **Entry gate:** same NDA package as 4.1 (shared). **Exit:** radar output cross-checked against their last two compliance certificates — zero discrepancies on current-period math.
- **Phase 2 — Production:** all funds; watch-list role restrictions; alerting kept inside their tenant (no flags in emails — links only); covenant-config change log (who edited a definition). **Exit:** risk officer signs the model card; watch list adopted into quarterly portfolio review.

---

### 4.3 Debt Maturity Wall Monitor

**Minimum data:** the facility register — balances, maturities, lenders, currencies, extensions (T2: lender names + balances identify relationships).

**Exposure analysis:**
- Lowest AI exposure of the five: the wall is pure aggregation; the LLM drafts commentary from the same aggregates that appear on the chart. Lender-level detail can be excluded from prompts entirely (commentary references "largest lender concentration: 23%", not the name).
- The register itself is the honeypot concern in miniature — it's the one file a competitor would want. Mitigations: field-level access (analyst sees own fund; CIO sees all), export watermarking, and the honest counter-argument: this file already exists as an uncontrolled spreadsheet on someone's desktop.

**Security talk track:** *"This replaces the master maturity spreadsheet that today has no access control, no audit trail, and lives in email attachments. The AI writes commentary from chart-level aggregates only — lender names never enter a prompt."*

**Implementation phases:**
- **Phase 0 — Synthetic:** messy-source ingestion demo (precomputed reconciliation per the implementation critic) + wall UI. **Exit:** all 6 seeded errors surfaced; wall reconciles.
- **Phase 1 — Pilot:** ingest their real per-fund trackers *inside their environment* (the validator runs locally; only the reconciliation report is reviewed together); coded lender IDs acceptable for the wall math. **Exit:** their team confirms the wall matches their hand-maintained view — and the validator has found at least the staleness they suspected (this is the trust moment).
- **Phase 2 — Production:** register becomes the maintained system of record; fund-level RBAC; quarterly freshness attestation workflow; watermarked exports. **Exit:** the master spreadsheet is retired (the real success metric).

---

### 4.4 Refinancing Window Optimizer

**Minimum data:** facility terms incl. prepayment mechanics (T2 — among the most negotiation-sensitive structured terms), hedge terms, valuations, user-supplied market assumptions.

**Exposure analysis:**
- Prepayment mechanics reveal negotiating positions; refi analysis reveals *intent* (which facilities you're planning to refinance — sensitive vis-à-vis current lenders). Both stay engine-side; the memo-draft LLM call receives the computed grid and breakevens with aliased deal names.
- Market assumptions flow *into* the system from the user, not out — no data leaves to fetch quotes in v1 (deliberately: no external market-data calls also means no leakage vector and no provenance ambiguity).
- Extra care: refi memos are the most likely artifact to be forwarded externally (to brokers/lenders). Standard disclosure footer + explicit "internal — contains strategy" classification on exports.

**Security talk track:** *"Nothing in this module calls the outside world — market assumptions are ones you type in, labelled as yours. Your prepayment clauses are structured entries in the engine, and the one thing this analysis reveals — your refinancing intentions — never appears in an AI prompt with a real deal name attached."*

**Implementation phases:**
- **Phase 0 — Synthetic:** break-cost archetype library + hand-worked reference suite + sizing solver + grid UI on SynthPort. **Exit:** all 4 archetypes match references; margin-equivalent lead metric implemented (practitioner critic).
- **Phase 1 — Pilot:** 2–3 facilities approaching maturity, mechanics entered via structured form with worked-example confirmation ("for a £10m prepayment today, cost would be £X — confirm"). **Entry gate:** covered by the standing NDA package. **Exit:** their debt lead validates the grid against one hand-built comparison; breakeven margins re-verify.
- **Phase 2 — Production:** all facilities; strategy-classified exports; access limited to the debt team (narrower than other modules — refi intent is need-to-know); assumption expiry dates active. **Exit:** used in one real refi decision process with the run manifest archived.

---

### 4.5 Breakeven & Sensitivity Engine

**Minimum data:** same T1 deal dataset as 4.1 — no additional data at all.

**Exposure analysis:**
- The sensitivity tab needs **no LLM whatsoever** (driver pickers are UI). The breakeven tab's NL routing is optional — the same gauges work from dropdowns. This makes it the demo where you can honestly offer an **AI-free mode**: full value, zero LLM exposure. Powerful with a security-nervous buyer: "turn the AI off and the product still works."
- Portfolio distance-to-breakeven ranking is internally sensitive (it's a vulnerability ranking of their own deals) — same role-restriction treatment as the Radar watch list.

**Security talk track:** *"This module works with the AI switched off entirely — dropdowns instead of typed questions, same answers. If your compliance team wants to start with zero AI surface, start here, and enable the natural-language layer only when they're comfortable."*

**Implementation phases:**
- **Phase 0 — Synthetic:** solver + monotonicity pre-scan + matrix runner on SynthPort, AI-free UI first. **Exit:** non-monotonic trap deal returns multiple candidates; all breakevens re-verify.
- **Phase 1 — Pilot:** runs automatically on whatever dataset Phase 1 of 4.1/4.2 established — no new data ask (sell this explicitly: "no incremental approval needed"). **Exit:** their analyst reproduces two breakevens by hand in Excel and matches.
- **Phase 2 — Production:** enable NL routing behind the confirmation gate with request-vs-executed logging (risk critic); ranking page role-restricted. **Exit:** distance-to-breakeven slide appears in an actual portfolio review deck.

---

## 5. How this changes the pitch

1. **Lead with the separation architecture** ("the AI sees your question, not your data") — it's true, structural, and immediately differentiating from "we upload your documents to a chatbot."
2. **Phase 0 removes the objection from the first meeting entirely:** the demo needs nothing from them. The security conversation happens at Phase-1 entry, with a one-page data-handling letter, about *one fund's structured extract* — a small, legible ask.
3. **Offer the AI-free mode (4.5) as the compliance on-ramp** when the buyer's legal team is the blocker.
4. **Sell the audit trail as a feature:** run manifests, RBAC, and freshness attestation give them *more* control than today's spreadsheet sprawl — the honest counter to the honeypot fear.

The repeatable method for applying this treatment to any other concept (06–20 or new domains) is in [06-security-extension-guide.md](06-security-extension-guide.md).
