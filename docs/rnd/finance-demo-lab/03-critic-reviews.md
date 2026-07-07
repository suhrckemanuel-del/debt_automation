# Critic Reviews — Top 5 Demos

Five critic passes over the top-5 selection (Stress Test Copilot, Covenant Headroom Radar, Maturity Wall Monitor, Refi Window Optimizer, Breakeven & Sensitivity Engine). Each critic states strengths, concerns, and required changes. A synthesis at the end lists which changes were adopted into the plan.

---

## 1. Finance Practitioner Critic
*(persona: 15 years in RE debt, runs a fund's capital markets desk, lives in Excel)*

**Strengths**
- The five-demo set matches how the job actually flows: monitoring → wall → decision. Nobody buys "AI"; they buy "my quarterly stress run in an hour."
- Covenant definitions as per-facility config (not hardcoded formulas) is the single most practitioner-credible design decision here. Every facility defines ICR slightly differently (net rent vs NOI, look-back vs look-forward, cash interest vs accrued).
- Break-cost archetypes with worked-example confirmation: correct instinct. I have seen make-whole computed off the wrong reference rate cost real money.

**Concerns**
1. **Quarterly cash flow granularity is too coarse for ICR realism.** Real ICR tests use trailing/projected 12-month figures on specific test dates with rent received (cash), not straight-line NOI quarters. If the demo shows a "Q2-2027 breach" that a practitioner recomputes differently in 5 minutes, credibility dies on contact.
2. **The Radar's base-case dependency is understated.** In practice the projected cash flows come from asset managers with wildly different optimism levels. The radar ranks deals, but the ranking partly measures who forecasts aggressively, not who is risky. Needs a normalization or at least an "assumption vintage/owner" tag per deal.
3. **Refi Optimizer's NPV framing is not how the decision is made.** Desks think in all-in running cost, day-one costs, and proceeds, rarely a discounted NPV delta. Keep the NPV as one lens but lead with "all-in margin equivalent" and "cash cost to break."
4. **Demo 4 (wall) is table stakes** — several treasury systems draw maturity walls. The differentiators (freshness stamps, seeded-error ingestion, hedge overlay) must be front and center or the audience yawns.

**Required changes:** test-date-accurate covenant math (trailing-12m option) in the engine spec; assumption-owner tags in the Radar; margin-equivalent as the primary refi metric; wall demo script leads with the messy-ingestion moment.

---

## 2. Risk / Compliance Critic
*(persona: fund risk officer + compliance sign-off on tools that touch investor-facing numbers)*

**Strengths**
- The Calculation/Judgment split and the confirmation-gate pattern are exactly the controls I would demand; having them designed-in rather than bolted on is rare.
- Synthetic labelling and freshness badges address the two most common misrepresentation vectors.

**Concerns**
1. **Model governance:** the moment engine outputs feed an IC paper or investor report, this becomes a "model" under model-risk policy: it needs versioning, change logs, an owner, and an independent validation record. The prototypes should ship with a model card + version stamp on every output, or adoption will stall at the risk committee.
2. **Audit trail:** scenario runs that inform decisions must be reproducible years later. Persist: engine version, dataset snapshot hash, scenario JSON, user, timestamp. This is cheap now, impossible retroactively.
3. **The What-If future (Demo 19 direction) is where I'd expect the first incident.** Even in the top-5 scope, the NL→scenario layer is an unvalidated component sitting in front of a validated engine. The confirmation table mitigates, but logging of *what the user asked vs what ran* must be retained too.
4. **"Illustrative" labels decay.** An illustrative refi margin shown in every demo becomes an anchor. Add a visible staleness/renewal date to labelled assumptions, not just provenance.
5. **Liability wording:** drafts that leave the building (lender packs, IC memos) need a standard generated-content disclosure line, decided with counsel once, applied automatically.

**Required changes:** version stamp + run manifest (engine version, data hash, scenario, user, time) on every output; assumption expiry dates; NL-request-vs-executed-operation logging; standard disclosure footer on exports.

---

## 3. Implementation Critic
*(persona: staff engineer who has shipped fintech calc engines)*

**Strengths**
- One engine, one dataset, five surfaces: right architecture, honest scoping. Golden-file testing against a hand-built Excel reference is the correct trust strategy.
- LLM confined to translation + narration keeps the hard reliability problem deterministic.

**Concerns**
1. **The engine is 80% of the work and the plan slightly hand-waves it.** Day counts, fixing conventions, stub periods, amortization edge cases, covenant test calendars, stepdowns, cures, hedges with amortizing notionals: this is a 4–8 week engine even before the refi break-cost module. Budget accordingly; do not let five UI surfaces starve the engine.
2. **Covenant-as-config is right but underspecified.** A per-facility formula config needs a small expression language or a parameterized template set. Recommend the template set (ICR variants ×4, DSCR ×3, LTV ×2, DY ×1) — an expression language is scope explosion.
3. **The seeded-error ingestion demo (wall) is a hidden scope trap:** entity resolution UX with human-confirmed merges is a real product surface. For the demo, precompute the reconciliation on the synthetic files rather than building general ingestion.
4. **Performance claims** (11×11 grid < 5s) are fine only if the engine is vectorized or the per-run cost is <40ms. Decide early: pandas-vectorized quarterly grid is fine; per-day simulation is not.
5. **Excel reference maintenance:** golden files rot. Freeze 3 reference workbooks, version them with the repo, and never edit them casually.

**Required changes:** engine-first milestone plan with explicit convention test suite; covenant template set instead of formula language; precomputed ingestion demo; per-run performance budget (<50ms/deal/scenario at quarterly granularity).

---

## 4. Commercial Potential Critic
*(persona: B2B fintech operator selling into PE/RE credit teams)*

**Strengths**
- The buyer (head of debt / CIO) sees their own pain in demos 1–4 within minutes; the wedge story (wall forces the dataset, dataset powers everything) is a credible land-and-expand.
- Quarterly recurrence (stress runs, reporting) supports subscription pricing; distance-to-breakeven is a killer one-slide artifact that spreads internally for free.

**Concerns**
1. **Competition check is missing.** Chatham Financial, Hazeltree, and in-house treasury systems cover pieces (hedge tracking, maturity walls). The under-served core is *covenant-aware forward projection + scenario batch* — demos 1/2/5. Sales narrative should lead there, with the wall as the onboarding artifact, not a headline feature.
2. **Data onboarding is the real sales objection.** Every prospect will ask "how does my data get in?" The synthetic demo dodges this; the pitch needs a one-slide honest answer (structured template + assisted setup), or deals stall post-demo.
3. **Who pays and how much:** this is a €30–80k/yr per-fund-manager tool, not a per-seat SaaS; small buyer universe, high touch. Fine — but it means the demo must be strong enough to justify a paid pilot, and the evaluator checklists double as pilot acceptance criteria. Lean into that.
4. **The Refi Optimizer is the best *expansion* module, not the best demo** — its value peaks episodically (when maturities approach). Sell it as the module that pays for the platform in one refi.

**Required changes:** pitch order = Radar → Stress → Breakeven (daily/quarterly value), wall as onboarding, refi as expansion; add a data-onboarding one-pager; reuse evaluator checklists as pilot acceptance criteria.

---

## 5. Simplicity Critic
*(persona: ruthless scope-cutter; asks "what is the smallest thing that proves the point?")*

**Strengths**
- Merging 09+10 into one surface was right. LLM-last build order is right.

**Concerns**
1. **Five demos is still three too many for a first outing.** The single most persuasive 15 minutes is: SynthPort → Stress Copilot (NL → confirmed shocks → heatmap) → click into Radar trajectory → breakeven gauges. That is *one* demo app with three tabs, not three products. Cut the wall and refi from the first build; mention them as roadmap slides.
2. **The scenario DSL is at risk of over-design.** Shocks needed for the demo: rate parallel shift, ERV %, yield shift, void injection, value haircut. Five shock types, flat JSON. Resist scope ("basis shocks", "tenant-level modelling") until a user asks.
3. **The confirmation table is the product's soul — invest UI effort there,** not in heatmap aesthetics. If confirming feels like friction instead of reassurance, the core thesis fails.
4. **Cut the auto-drafted narratives from v1 demos.** They add LLM risk for modest wow. The parsed-shock table and the verified breakevens are the differentiators; a narrative can be added in week 2 if demos go well.
5. **One dataset, not one per demo:** already the plan — enforce it. Any demo needing special data is drifting.

**Required changes:** first build = one app, three tabs (Stress / Radar / Breakeven) on one engine; 5 shock types only; narrative drafting deferred; wall + refi as roadmap.

---

## Synthesis — changes adopted into the plan

| Change | Source critic | Adopted? |
|---|---|---|
| Test-date-accurate covenant math (trailing-12m variants) in engine spec | Practitioner | ✅ engine requirement |
| Margin-equivalent as primary refi metric; NPV secondary | Practitioner | ✅ Demo 4 spec updated |
| Assumption owner/vintage tags in Radar | Practitioner | ✅ dataset schema addition |
| Run manifest (engine version, data hash, scenario, user, timestamp) on every output | Risk | ✅ engine requirement |
| Assumption expiry dates; disclosure footer on exports | Risk | ✅ UI standard |
| NL-request vs executed-operation logging | Risk | ✅ logged with manifest |
| Engine-first milestone plan; covenant template set (not expression language) | Implementation | ✅ build order |
| Precomputed ingestion for the wall demo | Implementation | ✅ (wall now roadmap anyway) |
| Performance budget <50ms/deal/scenario | Implementation | ✅ engine requirement |
| Pitch order: Radar → Stress → Breakeven; wall = onboarding; refi = expansion | Commercial | ✅ narrative |
| Data-onboarding one-pager; checklists as pilot acceptance criteria | Commercial | ✅ backlog item |
| **First build = ONE app, three tabs (Stress / Radar / Breakeven), one engine** | Simplicity | ✅ **supersedes 5-demo build**; wall & refi remain specced as phase 2 |
| 5 shock types only; narratives deferred; confirmation-table UX priority | Simplicity | ✅ v1 scope |

**Net effect:** the top-5 *analysis* stands, but the *first build* is a single three-tab prototype (Stress Test Copilot + Covenant Headroom Radar + Breakeven/Sensitivity) on the shared engine and SynthPort dataset, with the Maturity Wall and Refi Optimizer as specced phase-2 modules.
