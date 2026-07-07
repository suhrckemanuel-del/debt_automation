# Security Extension Guide — Repeatable Method

How to apply the security + phased-implementation treatment (as done for the top 5 in [05-security-layer.md](05-security-layer.md)) to **any other demo concept** — the remaining 15 in this catalog, or concepts in a different domain entirely. Working through this guide for one concept takes 30–60 minutes and produces a section in the same format as sections 4.1–4.5.

The treatment is deliberately *light*: one exposure analysis, one talk track, three phases. If the write-up grows past ~1 page per concept, you're doing compliance documentation, not demo design — stop and cut.

---

## Step 1 — Inventory the minimum data (10 min)

List what the demo *actually needs to compute its outputs* — not what would be nice. Then classify each item into the standing tiers:

- **T1 — structured numbers:** anonymizable figures (balances, rates, cash flows).
- **T2 — commercial terms:** structured but identifies counterparties or negotiated positions (lender names, covenant definitions, prepayment mechanics).
- **T3 — documents & external comms:** full agreements, live negotiation docs, anything that leaves the building.

**Two forcing questions:**
1. *Can a document requirement be replaced by a structured form?* (Demos 15 and 20 did this for waterfall/release mechanics — the user enters mechanics via a confirmed form instead of the system reading the agreement.) Every T3→T2 conversion you find here removes a legal sign-off later.
2. *Are real names needed for the math?* Almost never — coded deal/lender IDs usually suffice, and the mapping can stay client-side.

**Red flag:** if the concept is *inherently* T3 (Term Sheet Comparator, Lender Q&A), don't fight it — record it honestly and schedule it later in the roadmap. The tier is telling you the adoption cost, not forbidding the idea.

## Step 2 — Trace the two paths (10 min)

Draw (or write) the data-flow split for this concept:

- **Engine path:** what data the deterministic layer holds and computes on. Default posture: deployable client-side or single-tenant; never calls external services.
- **LLM path:** exactly what enters a prompt. Enumerate it — "the user's typed sentence," "aggregated results table X," "file excerpts for detection." If you can't enumerate it, the design isn't finished.

Then apply the three reduction moves, in order of preference:
1. **Eliminate** — does this concept need an LLM at all? (Demo 10 doesn't; Demo 14 doesn't. "No AI in the loop" is a legitimate and sellable answer.)
2. **Alias** — substitute deal/lender names with codes before the prompt; resolve after.
3. **Aggregate** — pass computed summaries (the numbers that would appear on a slide), never row-level data.

**Output of this step:** one sentence of the form *"The LLM sees ___ and only ___."* If that sentence is uncomfortable to say to a compliance officer, iterate.

## Step 3 — Name the concept-specific exposures (10 min)

Beyond the generic concerns, each concept has 1–3 exposures of its own. Hunt for them with these prompts:

- **Intent leakage:** do the *outputs* reveal strategy (refi intentions, disposal plans, weakness rankings)? → role-restrict those pages; classify exports.
- **Outbound surface:** does anything leave the building (lender answers, investor packs)? → mandatory human approval gate + disclosure footer; this is the highest-risk category.
- **Honeypot delta:** does centralizing this data create concentration risk that didn't exist before? → answer honestly with the audit-trail counter-argument (the current spreadsheet has *no* controls), plus RBAC/watermarking.
- **Third-party data:** does it hold data *about* counterparties (lender statements, term sheets) that carries its own confidentiality obligations? → legal question, flag for sign-off at Phase-1 entry.

## Step 4 — Write the talk track (5 min)

Two or three sentences, spoken aloud to a skeptical head of debt, that are **architecturally true** (not policy promises). Test: every claim must be enforced by the design from Step 2, not by good intentions. Patterns that work:

- *"The AI sees your question, not your data."* (separation)
- *"This runs with the AI switched off."* (elimination)
- *"X never enters a prompt."* (aliasing/aggregation — name the specific X they care about)
- *"More audit trail than your spreadsheet has today."* (honeypot counter)

Avoid: "bank-grade security," "fully encrypted," or any claim about certifications you don't hold yet.

## Step 5 — Cut the three phases (15 min)

Same skeleton every time; fill in the concept-specific parts:

**Phase 0 — Synthetic demo.** Always zero client data. Deliverables: the concept running on the shared synthetic dataset with its engineered events, the evaluator checklist passing, SYNTHETIC labels on. **Exit test:** the concept's benchmark test (already written at ideation) passes.

**Phase 1 — Pilot.** Entry gate: the *standing NDA + data-handling letter* (one package, reused across concepts — never negotiate per-module). Scope: one fund / a handful of deals, structured extract with coded IDs, single-tenant or client-side engine. **Exit test:** reconciliation against the client's own numbers on a small sample — pick the specific reconciliation for this concept (vs their Excel, their compliance certificate, their hand-built comparison). *The exit test is always "their number matches our number," never "they liked it."*

**Phase 2 — Production.** Entry gate: compliance sign-off using Phase-1 evidence. Standard hardening set (apply all, note any extras): SSO + RBAC with fund-level partitioning, run-manifest audit log, assumption expiry dates, export footers/watermarks, subprocessor list, model card + version stamps. Plus the concept-specific controls from Step 3 (e.g., need-to-know restriction on refi pages). **Exit test:** the concept is used in one real decision/process with the manifest archived.

**Sequencing tip:** if a concept shares its dataset with an already-piloted concept, say so explicitly in Phase 1 — "no incremental data approval needed" is the cheapest expansion argument you have (this is how the Breakeven Engine rides on the Stress Copilot's approval).

## Step 6 — File it (5 min)

Add the finished section to [05-security-layer.md](05-security-layer.md) alongside 4.1–4.5, and update that file's section-3 table row for the concept if the analysis changed its tier or one-liner. Keep the format identical: *minimum data / exposure analysis / talk track / three phases with entry gates and exit tests.*

---

## Worked micro-example (Demo 14, Amortization Auditor — 5-minute version)

- **Step 1:** needs facility mechanics (T2), rate fixings (T1), lender statements (T2, third-party data). No documents if mechanics come via structured form.
- **Step 2:** fully deterministic — LLM eliminated. "The LLM sees nothing; there is no AI in the computation path."
- **Step 3:** third-party exposure — lender statements carry the lender's confidentiality expectations; discrepancy reports could be sensitive in lender relationships → restrict to finance ops, legal flag at Phase 1.
- **Step 4:** *"This module has no AI in it at all — it's independent arithmetic that checks your lender's numbers, running entirely in your environment. If anything, it's a control you're adding, not a risk."*
- **Step 5:** Phase 0 = convention test suite on synthetic statements; Phase 1 = one facility-quarter reconciliation, exit when a seeded (or real) discrepancy is correctly explained; Phase 2 = standard hardening + finance-ops-only access.

Total: ~20 lines. That's the target weight.

---

## Adapting to a different domain

The method transfers unchanged; only the tier examples change. For any new domain (equities, private credit, infra): redefine the T1/T2/T3 examples in that domain's terms (Step 1), keep the two-path separation and the three reduction moves verbatim (Step 2), and rebuild the exposure prompts around that domain's equivalent of "intent leakage" and "outbound surface" (Step 3). Steps 4–6 are domain-independent.
