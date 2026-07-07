# Finance Modelling / Debt Workflow Demo Concepts (R&D Lab)

**Track:** Separate exploration track — modelling, analysis, and decision support.
**Explicitly out of scope:** the existing Agreement Intelligence product (document management / clause extraction as a product).
**Date:** 2026-07-07

**Ground rule for every demo (the Credibility Rule):**
The system must never pretend to know facts it cannot verify.
1. Synthetic data is always labelled **SYNTHETIC** in the UI and outputs.
2. Every result that depends on assumptions displays the assumptions inline (an "assumption panel" is a mandatory UI component in every demo).
3. Recommendations are always split into two visually distinct blocks: **Calculation** (deterministic, reproducible) and **Judgment** (the AI's interpretation, flagged as such).
4. Anything derived from market data must show source + as-of date, or be labelled "illustrative."

---

## Demo 01 — Stress Test Copilot

- **Name:** Stress Test Copilot
- **Target user:** VP / Director in debt & structured finance team; fund analysts running quarterly stress runs.
- **Exact workflow pain:** Stress testing is done by manually editing 5–15 Excel inputs per deal, per scenario, then hand-copying outputs into a summary tab. A 20-asset portfolio × 6 scenarios = 120 manual model runs, error-prone and stale within a quarter.
- **Manual process today:** Open each deal model, overwrite rent/ERV/exit yield/rate inputs, F9, screenshot or copy covenant outputs, paste into a "stress summary" workbook, repeat. Version chaos when models are updated mid-run.
- **AI-assisted workflow:** User defines scenarios in plain language ("rates +200bp, ERV −10%, 12-month void on top-3 tenants"); the system translates them into structured shocks, runs them through a deterministic calc engine against a portfolio dataset, and returns covenant outcomes, breach timing, and headroom deltas per deal — with the exact shock parameters shown.
- **First prototype design:** Python calc engine (loan schedules + property cash flows) + scenario DSL (JSON) + LLM layer that only *translates NL → scenario JSON* (never computes). Web dashboard shows scenario grid.
- **Required inputs:** Loan terms (balance, margin, index, amortization, maturity, covenants), property cash flows (rent roll summary, opex, capex), hedge terms, valuation & yield assumptions.
- **Expected outputs:** Per-deal and portfolio covenant results per scenario (ICR, DSCR, LTV, debt yield), first-breach date, headroom waterfall, scenario comparison table.
- **Dashboard/interface concept:** Scenario builder panel (NL box + parsed-shock confirmation table user must approve) → results heatmap (deals × scenarios, colored by worst covenant headroom) → drill-down per deal.
- **What can be automated:** Scenario translation, batch calculation, breach detection, tabulation, chart generation, narrative first draft.
- **What must remain human judgment:** Whether a scenario is plausible/relevant; which scenarios to present to IC; management actions in response to breaches; any override of model assumptions.
- **Risks:** Users trust the calc engine before it is validated against their Excel models; shock translation misreads intent ("−10% rents" vs "−10% ERV").
- **Failure modes:** NL→JSON mistranslation silently applied; calc engine diverges from the deal's real Excel model; covenant definitions differ per facility and the engine applies a generic one.
- **Validation method:** Parallel-run against 3 real (or realistic synthetic) Excel models; every scenario run shows the parsed shock table for user confirmation before execution; unit tests on covenant math.
- **Benchmark test:** 10 scenarios × 5 synthetic deals: engine outputs must match a hand-built Excel reference to <0.1% on ICR/DSCR/LTV; NL translation accuracy ≥95% on a 50-prompt test set, with 100% of mistranslations caught by the confirmation step.
- **Why this could become valuable:** Stress testing is universal, quarterly, painful, and board-visible. A trusted engine here becomes the platform every other demo (headroom, refi, downside) plugs into.

---

## Demo 02 — Covenant Headroom Radar

- **Name:** Covenant Headroom Radar
- **Target user:** Portfolio/asset manager responsible for covenant compliance; debt team lead.
- **Exact workflow pain:** Covenant headroom is checked at test dates, backward-looking. Nobody has a forward view of *when* headroom gets thin under current assumptions, so breaches surprise people who technically had all the data.
- **Manual process today:** Quarterly compliance certificates computed per facility in Excel; forward projection only done ad hoc when someone is nervous.
- **AI-assisted workflow:** System projects each covenant forward 8–12 quarters from the current cash flow model, computes headroom trajectory, flags the quarter each covenant first drops below a user-set warning threshold, and drafts a "watch list" narrative with the driving assumptions displayed.
- **First prototype design:** Same calc engine as Demo 01; add time-series projection + threshold flags; simple portfolio table UI with sparkline headroom per covenant.
- **Required inputs:** Covenant definitions and levels (including stepdowns), current financials, projected cash flows, debt schedules, valuation assumptions with as-of dates.
- **Expected outputs:** Headroom time series per covenant per facility; "first-warning quarter"; ranked watch list; assumption sheet per projection.
- **Dashboard/interface concept:** Portfolio grid: rows = facilities, columns = covenants, cells = months-to-warning with sparkline; click-through to trajectory chart + assumption panel.
- **What can be automated:** Projection math, flagging, ranking, drafting the watch-list commentary.
- **What must remain human judgment:** Whether projected cash flows are believable; whether to engage lenders early; cure strategy.
- **Risks:** A projection is only as good as the model; users may read flags as predictions rather than conditional statements.
- **Failure modes:** Stale valuations produce false comfort on LTV; covenant stepdowns missed; equity cure rights not modelled, overstating breach severity.
- **Validation method:** Back-test on synthetic history: project from T−4 quarters and compare flags to "actual" synthetic outcomes; covenant math unit-tested per definition.
- **Benchmark test:** On a 15-facility synthetic portfolio with 3 embedded future breaches, radar must flag all 3 with ≥2 quarters' notice and ≤2 false positives at warning threshold 15%.
- **Why this could become valuable:** Converts covenant monitoring from compliance chore to early-warning system; direct link to avoided defaults makes ROI arguable in one sentence.

---

## Demo 03 — Refinancing Window Optimizer

- **Name:** Refinancing Window Optimizer
- **Target user:** Head of debt / capital markets team planning refinancings 12–36 months out.
- **Exact workflow pain:** Deciding *when* to refinance (and whether to extend, refinance, or sell) is done with one-off Excel scratch models that mix rate views, prepayment costs, and fee math inconsistently across deals.
- **Manual process today:** Analyst builds a bespoke comparison of "refi now vs at maturity" per deal when asked; assumptions (exit spreads, swap rates, fees) copied from emails; rarely refreshed.
- **AI-assisted workflow:** For each facility, the system computes refinance-vs-hold economics across a grid of refi dates and rate/spread scenarios: break costs, prepayment fees, new-money proceeds at target LTV/ICR-constrained sizing, all-in cost delta. AI drafts the trade-off narrative; every market input is labelled with source/as-of or "user assumption."
- **First prototype design:** Calc engine module: prepayment cost calculator + debt sizing function (min of LTV, ICR, debt-yield constraints) + NPV comparison; scenario grid UI.
- **Required inputs:** Current facility terms incl. prepayment/spens/make-whole clauses, hedge MTM (or synthetic proxy), assumed refi spreads & index curves (user-supplied or labelled illustrative), valuation, cash flows.
- **Expected outputs:** Refi economics table by candidate date; constrained debt capacity at each date; breakeven refi spread; recommendation draft split into Calculation vs Judgment.
- **Dashboard/interface concept:** Timeline view per facility: maturity, call windows, hedge roll-offs on one axis; "refi economics" curve (NPV delta by refi date) below; assumptions sidebar always visible.
- **What can be automated:** Break cost math, sizing math, NPV grid, sensitivity to spread/rate, first-draft memo.
- **What must remain human judgment:** Rate view, lender appetite, relationship considerations, fund strategy (hold vs sell).
- **Risks:** Prepayment clauses are bespoke — a generic break-cost formula gives confidently wrong numbers; rate assumptions read as forecasts.
- **Failure modes:** Hedge break costs omitted; make-whole computed on the wrong reference; users treat the "optimal window" as advice rather than conditional math.
- **Validation method:** Break-cost calculator tested against hand-worked examples for 4 clause archetypes (spens, make-whole, fixed fee schedule, swap break); assumptions panel mandatory.
- **Benchmark test:** For 5 synthetic facilities with known "correct" answers built by hand, NPV deltas match within 1bp of margin-equivalent; sizing respects all three constraints in 100% of grid cells.
- **Why this could become valuable:** Refi decisions move basis points on large notionals; even a small improvement in timing/negotiation prep is worth real money, and the analysis is currently artisanal.

---

## Demo 04 — Debt Maturity Wall Monitor

- **Name:** Debt Maturity Wall Monitor
- **Target user:** CIO / Head of debt across funds; also useful for investor relations.
- **Exact workflow pain:** "What matures when, across all funds and currencies, and how bad is the worst 12 months?" takes days to answer because facility data lives in per-deal trackers.
- **Manual process today:** Someone maintains a master spreadsheet of maturities, updated manually and always partially stale; extension options and hedge roll-offs tracked separately or not at all.
- **AI-assisted workflow:** Single normalized facility dataset → auto-generated maturity wall by fund/currency/lender, with extension options shown as conditional (base maturity vs fully-extended), refi requirement sized under current market assumptions, and concentration flags.
- **First prototype design:** Data schema + ingestion validator + one strong dashboard (stacked bar wall, filterable), plus AI-drafted quarterly commentary.
- **Required inputs:** Facility register: balances, maturities, extension options + conditions, lender, currency, fund; optionally hedge maturities overlaid.
- **Expected outputs:** Maturity wall charts (base and extended cases), refi calendar, concentration metrics (per lender/year/currency), commentary draft.
- **Dashboard/interface concept:** One-page wall: stacked bars by year-quarter, toggle base/extended, overlay line = hedge notional rolling off; click bar → facility list.
- **What can be automated:** Aggregation, chart generation, concentration math, commentary drafting, staleness detection ("balance last updated 94 days ago").
- **What must remain human judgment:** Whether extension conditions will actually be met; refi feasibility per asset; which concentrations matter.
- **Risks:** Garbage-in: a stale register produces a confident, wrong wall. Mostly a data-plumbing problem dressed as an AI problem.
- **Failure modes:** Extension options counted as certain; FX conversion at stale rates; duplicated facilities across fund trackers.
- **Validation method:** Ingestion validator with per-field freshness stamps shown in UI; reconciliation report vs source trackers.
- **Benchmark test:** From 3 messy synthetic source spreadsheets (with deliberate duplicates, stale rows, missing extensions), system produces a wall matching the hand-reconciled truth with 100% facility coverage and all 6 seeded data errors flagged.
- **Why this could become valuable:** It is the CIO-level view; low modelling risk, high visibility, and the normalized facility register it forces into existence is the substrate for every other demo.

---

## Demo 05 — Hedge Coverage & Maturity Ladder

- **Name:** Hedge Coverage & Maturity Ladder
- **Target user:** Treasury / debt team member responsible for interest-rate hedging.
- **Exact workflow pain:** Hedge notionals, caps strike levels, and maturities are tracked per-deal; nobody can quickly answer "what % of floating debt is hedged next year, and where do we go unhedged?"
- **Manual process today:** A hedging spreadsheet updated after each trade; coverage ratios computed occasionally; cap expiries discovered late, forcing spot-market decisions.
- **AI-assisted workflow:** System joins debt schedules with hedge instruments, computes coverage ratio through time (including amortization mismatch), flags coverage cliffs, and estimates re-hedging cost under user-labelled rate assumptions.
- **First prototype design:** Coverage calculator over time buckets + ladder chart; cap/swap payoff modelling kept simple (intrinsic + user-provided premium assumptions, labelled).
- **Required inputs:** Floating debt schedules by index; hedge register (type, notional schedule, strike/rate, maturity, counterparty); rate curve (labelled source or illustrative).
- **Expected outputs:** Coverage % by quarter per fund/index; cliff dates; unhedged notional projection; indicative re-hedge cost with assumptions shown.
- **Dashboard/interface concept:** Ladder chart: floating debt area vs hedged notional area over time; gap shaded red; table of upcoming expiries with days-to-expiry.
- **What can be automated:** Coverage math, cliff detection, expiry alerts, cost estimates, commentary.
- **What must remain human judgment:** Target hedge ratio policy, instrument choice, timing, counterparty selection.
- **Risks:** Option pricing beyond intrinsic value is easy to get subtly wrong; better to under-claim (indicative only).
- **Failure modes:** Amortizing hedge notionals treated as bullet; basis mismatch (SONIA vs EURIBOR) ignored in coverage; forward premium presented as a quote.
- **Validation method:** Coverage math unit tests incl. amortizing schedules; pricing outputs always labelled "indicative — not a quote."
- **Benchmark test:** Synthetic book of 10 loans + 8 hedges with engineered mismatches: system must report coverage per quarter matching hand calc exactly and flag all 4 engineered cliffs.
- **Why this could become valuable:** Hedge cliffs are a recurring source of avoidable cost; the analysis is simple math applied consistently — ideal automation profile.

---

## Demo 06 — Term Sheet Comparator (New Debt Raising)

- **Name:** Term Sheet Comparator
- **Target user:** Debt raising lead comparing competing lender proposals.
- **Exact workflow pain:** 3–6 term sheets arrive as PDFs with different structures (margin vs fees vs cash sweep vs covenants); comparison grids are hand-built per process and economics are compared inconsistently.
- **Manual process today:** Analyst re-types terms into a comparison table; all-in cost computed differently each time; non-economic terms (transferability, cure rights) compared by eye.
- **AI-assisted workflow:** Extract terms into a normalized schema (human verifies each extracted field against the source snippet), compute like-for-like all-in cost (IRR-based, over expected hold), score non-economic terms against a house checklist, and produce a comparison pack. Extraction confidence shown per field.
- **First prototype design:** Schema + extraction with per-field source citation + effective-cost calculator + comparison grid UI with "verify" workflow.
- **Required inputs:** Term sheet documents (synthetic for demo); house term-preference checklist; expected hold period and drawdown profile.
- **Expected outputs:** Normalized comparison grid; all-in cost per proposal under stated profile; flags where terms deviate from house preferences; negotiation-point draft.
- **Dashboard/interface concept:** Grid with proposals as columns; every cell shows value + citation link to source text; unverified cells amber until human ticks them.
- **What can be automated:** Extraction, normalization, effective cost math, deviation flagging, first-draft negotiation list.
- **What must remain human judgment:** Weighting economics vs flexibility, relationship factors, final negotiation strategy.
- **Risks:** Sits closest to the Agreement Intelligence product — must be scoped as *modelling on top of terms*, not document management; extraction errors in a live negotiation are costly.
- **Failure modes:** Fee timing misread (upfront vs annual); margin ratchets flattened to a single number; hallucinated values for absent terms (must render "not specified" instead).
- **Validation method:** Every field cites source text; "not specified" is a first-class value; effective-cost calculator unit tested against hand examples.
- **Benchmark test:** 5 synthetic term sheets with 40 fields each: extraction ≥95% accurate, 0 hallucinated values (absent terms must be "not specified"), all-in cost within 1bp of hand calculation.
- **Why this could become valuable:** Every debt raise runs this comparison under time pressure; standardized economics + citation discipline is an immediately credible sell.

---

## Demo 07 — Downside Case Generator

- **Name:** Downside Case Generator
- **Target user:** IC preparers; fund managers needing defensible downside cases for approvals and valuations.
- **Exact workflow pain:** "Add a downside case" means an analyst invents haircuts with little consistency across deals or vintages; IC members can't tell whether Deal A's downside is harsher than Deal B's.
- **Manual process today:** Copy base case, apply ad hoc haircuts (−10% ERV here, +50bp yield there), no record of why.
- **AI-assisted workflow:** System proposes downside cases from a *documented severity library* (e.g., "GFC-style: yields +150bp, rents −20%, 18m re-let"; "rate shock"; "sector-specific"), applies them through the calc engine, and produces comparable severity metrics across deals. Every case shows its parameter provenance (library entry or user edit).
- **First prototype design:** Severity library (YAML, human-curated, with rationale text per entry) + calc engine + comparison UI; LLM helps select/adapt library cases to the asset type and drafts rationale.
- **Required inputs:** Base case model per deal; severity library; asset metadata (sector, geography, tenancy profile).
- **Expected outputs:** 2–4 downside cases per deal with parameters, results, cross-deal severity comparison ("this downside cuts equity value 34% vs portfolio median 28%").
- **Dashboard/interface concept:** Case cards per deal: parameters left, outcome deltas right; portfolio consistency view showing severity distribution.
- **What can be automated:** Case instantiation, calculation, cross-deal normalization, rationale drafting.
- **What must remain human judgment:** Whether the library severities are appropriate; final case selection for IC; any deal-specific adjustment.
- **Risks:** A library legitimizes laziness — cases applied without thought; severity calibration is a judgment the system must not claim as fact.
- **Failure modes:** Sector-inappropriate shocks (retail haircuts applied to logistics); double-counting (yield shift + value haircut both applied).
- **Validation method:** Library entries carry written rationale + review date; engine warns on overlapping shock channels.
- **Benchmark test:** Given 6 synthetic deals across 3 sectors, generated cases must be internally consistent (no double-count warnings), and severity ranking must match a practitioner's hand ranking in ≥5/6 cases.
- **Why this could become valuable:** Consistent, explainable downside cases are an audit/IC-governance win, not just a time save — that's a budget line.

---

## Demo 08 — Assumption Registry & Drift Detector

- **Name:** Assumption Registry & Drift Detector
- **Target user:** Head of portfolio analytics; anyone reconciling numbers between models, IC memos, and reports.
- **Exact workflow pain:** The same assumption (exit yield, ERV growth, refi spread) lives in a dozen files with different values and no owner; reports contradict each other.
- **Manual process today:** Nobody reconciles until a contradiction surfaces in front of IC or an investor; then a painful archaeology exercise.
- **AI-assisted workflow:** Central registry of named assumptions (value, unit, owner, as-of, source, rationale); AI scans model files/memos to *detect* assumption values in the wild and flags drift vs registry ("Deal-7 model uses exit yield 5.25%; registry says 5.50% as of May-2026").
- **First prototype design:** Registry (SQLite/JSON) + CRUD UI + scanner that extracts candidate assumption values from xlsx/docx with cell/paragraph citations; drift report.
- **Required inputs:** Registry seed; access to model files/memos (synthetic set for demo).
- **Expected outputs:** Drift report with citations; assumption changelog; per-report "assumptions used" appendix auto-generated.
- **Dashboard/interface concept:** Registry table + drift inbox (each item: registry value vs found value vs file location, resolve/accept buttons).
- **What can be automated:** Detection, diffing, changelog, appendix generation.
- **What must remain human judgment:** Which value is right; who owns each assumption; when drift is intentional (deal-specific override).
- **Risks:** Scanner false positives erode trust fast; cultural adoption (people must maintain the registry) is the real barrier.
- **Failure modes:** Matching "5.25%" to the wrong concept; treating deliberate deal-level overrides as errors.
- **Validation method:** Precision measured on labelled synthetic file set; every detection carries a citation the user can open.
- **Benchmark test:** 20 synthetic files with 60 planted assumption instances (15 drifted): detector achieves ≥90% recall on drifted values with ≥85% precision.
- **Why this could become valuable:** Assumption chaos is the root cause behind half the other pains; a registry becomes load-bearing infrastructure.

---

## Demo 09 — Breakeven Solver

- **Name:** Breakeven Solver
- **Target user:** Deal analysts and IC members who ask "what would have to happen for this to break?"
- **Exact workflow pain:** Goal-seek in Excel, one variable at a time, per covenant, per deal — tedious and rarely done systematically.
- **Manual process today:** Manual goal-seek or trial-and-error; results live in someone's head or a dead scratch tab.
- **AI-assisted workflow:** For any covenant or return metric, solve for the breakeven value of any input (exit yield, ERV, rate, void months) holding others at base; present as a "distance to breakeven" panel with all assumptions shown.
- **First prototype design:** Root-finding over the calc engine (bisection is enough); breakeven panel UI; NL question routing ("what SONIA breaks ICR on Deal 3?") → solver parameters user confirms.
- **Required inputs:** Same as Demo 01 (deal models in engine format).
- **Expected outputs:** Breakeven table per deal: input, base value, breakeven value, % distance; multi-covenant "binding constraint" identification.
- **Dashboard/interface concept:** Per-deal card: gauges of distance-to-breakeven per key input; portfolio table sorted by smallest distance.
- **What can be automated:** All solving and tabulation; identification of the binding covenant.
- **What must remain human judgment:** Plausibility of reaching breakeven levels; actions.
- **Risks:** Low — math is deterministic; main risk is non-monotonic relationships confusing a naive solver.
- **Failure modes:** Solver converges to wrong root when relationship is non-monotonic (e.g., cash sweep kinks); silently reports it.
- **Validation method:** Solver verified by plugging breakeven value back in (residual check shown in UI); non-convergence reported honestly.
- **Benchmark test:** 25 breakeven queries on synthetic deals: 100% of reported breakevens re-verify to within tolerance; non-monotonic trap cases must return "multiple solutions" not a single number.
- **Why this could become valuable:** "Distance to breakeven" is the single most intuitive risk statistic for non-modellers (IC, investors); cheap to build on the engine.

---

## Demo 10 — Sensitivity Matrix Generator

- **Name:** Sensitivity Matrix Generator
- **Target user:** Analysts building IC papers and lender presentations.
- **Exact workflow pain:** Two-way data tables in Excel break, recalc slowly, and get rebuilt from scratch per deal per paper.
- **Manual process today:** Excel data tables or manual grids; formatting for the memo eats an afternoon.
- **AI-assisted workflow:** Pick any two drivers and any output metric; system generates the matrix, colors covenant-breach cells, and exports a memo-ready table with an auto-drafted caption stating base case and assumptions.
- **First prototype design:** Grid runner over calc engine + styled export (xlsx/png); driver presets per asset type.
- **Required inputs:** Deal in engine format; driver ranges (defaulted sensibly, editable).
- **Expected outputs:** Formatted 2-way matrices; breach frontier overlay; caption text.
- **Dashboard/interface concept:** Driver pickers + live matrix; toggle metric (IRR, ICR min, first-breach date); one-click export.
- **What can be automated:** Everything except choosing which sensitivities matter for the story.
- **What must remain human judgment:** Driver selection and ranges appropriate to the deal narrative.
- **Risks:** Minimal; a commodity feature — differentiation is speed and memo-ready polish.
- **Failure modes:** Range defaults that embarrass (ERV −50%); step sizes hiding a cliff between grid points.
- **Validation method:** Spot-check cells vs single runs; cliff detection (flag if adjacent cells cross breach with gap > threshold, suggest finer step).
- **Benchmark test:** Matrix cells match individual engine runs exactly (they're the same code path); generation of a 11×11 grid < 5 seconds.
- **Why this could become valuable:** Not a product alone, but the highest-frequency artifact analysts produce — great demo "wow per minute" and a wedge into daily use.

---

## Demo 11 — Lender Q&A Pack Builder

- **Name:** Lender Q&A Pack Builder
- **Target user:** Debt team running a financing/refinancing process fielding lender diligence questions.
- **Exact workflow pain:** 50–200 lender questions per process, many answerable from data the team already has; answers drafted from scratch, inconsistently, with version risk.
- **Manual process today:** Excel question tracker; analysts hunt through models/reports; senior review of each answer.
- **AI-assisted workflow:** Questions ingested into tracker; AI classifies each (data-answerable / judgment / needs-legal), drafts data-answerable responses *only from the connected dataset* with citations, and leaves judgment questions flagged for humans. Nothing sends without human approval.
- **First prototype design:** Question tracker + retrieval over the deal dataset + drafting with per-claim citation; approval workflow.
- **Required inputs:** Question list; deal dataset (facility terms, cash flows, tenancy, valuations — synthetic for demo).
- **Expected outputs:** Draft answers with citations; unanswerable-as-stated flags; response pack export; audit log.
- **Dashboard/interface concept:** Kanban: New → Drafted → Approved → Sent; each draft shows claim-by-claim source links.
- **What can be automated:** Classification, retrieval, drafting, consistency check against previously approved answers.
- **What must remain human judgment:** Every approval; strategy on what to disclose; judgment/legal questions entirely.
- **Risks:** Highest-stakes output channel (external counterparties); one hallucinated number in a lender pack is a serious incident.
- **Failure modes:** Confident answer from stale data; inconsistency with a previously sent answer; answering a question the data can't support.
- **Validation method:** Hard rule: no claim without citation; consistency checker against sent history; human approval gate is non-optional.
- **Benchmark test:** 60 synthetic lender questions: classification accuracy ≥90%; of data-answerable drafts, 100% of numeric claims traceable to source; 0 fabricated values on the 10 trap questions whose answers aren't in the dataset (must flag "not in dataset").
- **Why this could become valuable:** Directly compresses the most time-pressured phase of debt raising; the citation discipline is the product.

---

## Demo 12 — IC Debt Memo Drafter

- **Name:** IC Debt Memo Drafter
- **Target user:** Analysts/VPs writing financing sections of IC papers.
- **Exact workflow pain:** The debt section of every IC memo is 70% boilerplate assembly of numbers that exist elsewhere, re-typed with transcription errors.
- **Manual process today:** Copy numbers from model + facility docs into Word; senior redlines; numbers go stale between draft and IC.
- **AI-assisted workflow:** From the deal dataset, generate the financing section with every figure linked to its source; narrative passages drafted by AI clearly watermarked "draft — review required"; refresh figures on demand.
- **First prototype design:** Template with typed slots bound to dataset fields; LLM writes connective prose only; figure-refresh diff view.
- **Required inputs:** Deal dataset; memo template; house style examples.
- **Expected outputs:** Draft financing section (docx) with source-linked figures; change-log when refreshed.
- **Dashboard/interface concept:** Split view: memo left, per-figure source pane right; stale-figure badges.
- **What can be automated:** Figure population, chart insertion, refresh, first-draft prose.
- **What must remain human judgment:** Recommendation, risk framing, tone, anything the committee will grill.
- **Risks:** Prose drift into unsupported claims; "sounds finished" ≠ "is right."
- **Failure modes:** LLM inserting numbers into prose that don't come from slots; template rigidity fights real memo variety.
- **Validation method:** Lint: any number appearing in prose must match a bound slot value or be flagged; human review gate.
- **Benchmark test:** 5 synthetic deals: 100% of figures in output traceable to dataset; prose-number lint catches all 8 seeded violations.
- **Why this could become valuable:** High-frequency, high-drudgery task; the source-linking makes drafts *more* trustworthy than today's hand-copied memos.

---

## Demo 13 — Portfolio Early-Warning Flags

- **Name:** Portfolio Early-Warning Flags
- **Target user:** Fund managers / risk function monitoring across funds and jurisdictions.
- **Exact workflow pain:** Risk signals (headroom erosion, tenant events, hedge cliffs, valuation staleness) live in separate places; portfolio review meetings rediscover them late.
- **Manual process today:** Quarterly deck assembled manually; between quarters, monitoring is memory-based.
- **AI-assisted workflow:** Rule-based flag engine over the normalized dataset (thresholds are explicit and user-configurable) + AI-drafted "what changed since last review" narrative per fund; every flag links to its rule and data.
- **First prototype design:** Flag rules (YAML) + evaluation job + inbox UI; deliberately rules-first, LLM only for narrative.
- **Required inputs:** Normalized portfolio dataset (as Demos 02/04/05); rule config.
- **Expected outputs:** Flag inbox with severity; per-fund change narrative; trend view of flag counts.
- **Dashboard/interface concept:** Inbox grouped by severity; each flag: rule, current value, threshold, trend sparkline, data as-of stamp.
- **What can be automated:** Evaluation, deduplication, trend tracking, narrative drafting.
- **What must remain human judgment:** Threshold calibration, triage, action.
- **Risks:** Alert fatigue from bad thresholds; false authority if data freshness isn't front-and-center.
- **Failure modes:** Flags firing on stale data; duplicate flags for one underlying cause.
- **Validation method:** Every flag displays data as-of date; replay on synthetic history to tune noise.
- **Benchmark test:** Synthetic 12-month replay with 10 seeded events: ≥9 flagged before "quarter-end discovery" date, false-positive rate < 1 per fund per week.
- **Why this could become valuable:** It's the retention product — daily/weekly touchpoint that keeps the dataset alive and the team engaged.

---

## Demo 14 — Amortization & Fee Schedule Auditor

- **Name:** Amortization & Fee Schedule Auditor
- **Target user:** Finance ops / debt team verifying lender statements and model schedules.
- **Exact workflow pain:** Lender interest/fee statements are trusted or checked by sampling; model amortization tabs drift from facility mechanics after amendments.
- **Manual process today:** Occasional manual recomputation when a number looks off; discrepancies found months late.
- **AI-assisted workflow:** Independent recomputation of interest, fees, and amortization from facility terms + rate fixings; automatic reconciliation against lender statements and model tabs; discrepancy report with the exact computation shown.
- **First prototype design:** Deterministic schedule engine + statement parser (structured input first, PDF later) + reconciliation diff UI.
- **Required inputs:** Facility mechanics (day count, margin, index, fixing convention, fee schedule), rate fixings, statements to check.
- **Expected outputs:** Recomputed schedules; discrepancy list with amounts and causes; "clean" attestations per period.
- **Dashboard/interface concept:** Reconciliation table per facility-period: expected vs stated vs model, delta, drill into calculation trace.
- **What can be automated:** Recomputation, matching, materiality filtering.
- **What must remain human judgment:** Whether to raise a discrepancy with the lender; interpreting ambiguous mechanics.
- **Risks:** Day-count/fixing convention subtleties; being wrong while accusing a lender's statement is embarrassing.
- **Failure modes:** Convention mismatch produces systematic false discrepancies; amendment history not captured.
- **Validation method:** Convention test suite (ACT/360, ACT/365, 30/360, lookback fixings); calculation trace shown for every number.
- **Benchmark test:** 12 synthetic facility-quarters incl. 3 seeded lender errors and 2 convention traps: catch all 3 errors, 0 false discrepancies on trap cases.
- **Why this could become valuable:** Occasionally finds actual money (overcharged interest); "found £40k in the demo" is a memorable sale.

---

## Demo 15 — Cash Trap / Cash Sweep Simulator

- **Name:** Cash Trap / Sweep Simulator
- **Target user:** Asset managers on deals with cash trap covenants; fund finance planning distributions.
- **Exact workflow pain:** Cash trap triggers (DSCR/LTV-linked) interact with sweeps and distributions in ways Excel models handle inconsistently; distribution forecasts are wrong when traps bite.
- **Manual process today:** Simplified or omitted in models; surprises when the trap triggers and planned distributions can't be made.
- **AI-assisted workflow:** Model the waterfall mechanics explicitly (trigger tests, trap accounts, cure/release conditions); simulate distributions under base and stress; show trapped-cash timeline and release conditions.
- **First prototype design:** Waterfall state machine + scenario runner (reuses Demo 01 engine); trapped-cash chart.
- **Required inputs:** Waterfall/trap mechanics per facility; cash flows; covenant projections.
- **Expected outputs:** Distribution forecast with trap periods shaded; trapped balance over time; release-condition tracker.
- **Dashboard/interface concept:** Timeline: distributable vs trapped cash stacked; trigger status strip below; scenario toggle.
- **What can be automated:** Mechanics simulation, scenario comparison, release-condition monitoring.
- **What must remain human judgment:** Interpretation of ambiguous trap language; distribution policy decisions.
- **Risks:** Trap mechanics are bespoke legal language → encoding errors; overlaps Agreement Intelligence on extraction (keep mechanics entry manual/structured for the demo).
- **Failure modes:** Cure timing misencoded (test date vs payment date); trap release logic wrong direction.
- **Validation method:** Mechanics encoded via a structured form the user confirms; state machine unit tests per archetype.
- **Benchmark test:** 4 trap archetypes × 3 scenarios hand-worked: simulator matches all 12 trapped-cash paths exactly.
- **Why this could become valuable:** Directly affects distributions — the number fund managers care about most personally.

---

## Demo 16 — Rate Scenario Pack Generator

- **Name:** Rate Scenario Pack Generator
- **Target user:** Debt/treasury team producing rate-sensitivity views for management and IC.
- **Exact workflow pain:** "What do forwards imply, and what if they're wrong by ±100/200bp?" answered with hand-built curves pasted into models inconsistently.
- **Manual process today:** Someone downloads a forward curve occasionally; shocks applied per-model with different conventions.
- **AI-assisted workflow:** Maintain a versioned curve set (user-uploaded or clearly-labelled illustrative); generate standard shock packs (parallel, steepener, forwards-realized); propagate consistently through all floating debt and hedges; output portfolio interest cost distribution.
- **First prototype design:** Curve store with as-of stamps + shock transformer + propagation through engine; cost fan chart.
- **Required inputs:** Curve data (labelled source) or illustrative curves; portfolio dataset with hedge terms.
- **Expected outputs:** Interest cost by scenario by period; hedged vs unhedged split; per-deal ICR impact.
- **Dashboard/interface concept:** Fan chart of portfolio interest cost; scenario legend with curve provenance; deal-level table.
- **What can be automated:** Curve versioning, shock generation, propagation, charting.
- **What must remain human judgment:** Which scenarios to take seriously; any actual rate view.
- **Risks:** Curve provenance is everything — an unlabelled stale curve is exactly the "pretend knowledge" failure this lab must avoid.
- **Failure modes:** Mixing curve as-of dates across deals; compounding/lookback conventions wrong on RFRs.
- **Validation method:** As-of stamp mandatory and displayed on every output; RFR convention tests.
- **Benchmark test:** Synthetic portfolio: parallel +100bp shock must change unhedged annual interest by exactly notional×1% (convention-adjusted), verified per deal; capped deals must show payoff kink at strike.
- **Why this could become valuable:** Rates are the dominant risk factor for levered real estate; a consistent scenario pack ends the per-model inconsistency problem.

---

## Demo 17 — Quarterly Debt Reporting Pack Assembler

- **Name:** Reporting Pack Assembler
- **Target user:** Team producing quarterly debt reports for management/investors.
- **Exact workflow pain:** The quarterly pack is 30–60 pages of tables/charts assembled by hand from the same underlying data every quarter; 3–5 person-days per fund.
- **Manual process today:** Excel → PowerPoint copy-paste marathon; late data changes force partial redos; footnotes go stale.
- **AI-assisted workflow:** Pack defined once as a template bound to the dataset; each quarter, one-click regeneration with a "what changed vs last quarter" diff and AI-drafted commentary (watermarked draft) per section.
- **First prototype design:** Template engine (pptx/pdf generation) over the normalized dataset; diff engine; commentary drafting.
- **Required inputs:** Normalized dataset (as prior demos); pack template; prior-quarter pack for diffing.
- **Expected outputs:** Generated pack; change summary; stale-data warnings inline.
- **Dashboard/interface concept:** Pack preview with per-page data-freshness badges; regenerate button; commentary edit pane.
- **What can be automated:** All assembly, charting, diffing, first-draft commentary.
- **What must remain human judgment:** Commentary sign-off, framing, disclosure decisions.
- **Risks:** Pack formats vary hugely between firms — template building is services work; automation of a wrong number is faster wrongness (freshness badges essential).
- **Failure modes:** Chart bound to wrong filter (fund A chart shows fund B); footnote/period mismatches.
- **Validation method:** Every figure carries dataset query provenance; automated checks: totals reconcile across pages.
- **Benchmark test:** Regenerate a 25-page synthetic pack: 100% figures match dataset queries; cross-page reconciliation checks pass; generation < 2 min.
- **Why this could become valuable:** Biggest raw time-save on the list, and quarterly recurrence means the value repeats 4× a year per fund.

---

## Demo 18 — Debt Capacity Sizer

- **Name:** Debt Capacity Sizer
- **Target user:** Acquisitions and debt teams sizing new financings or upsizes.
- **Exact workflow pain:** "How much debt can this asset support?" recomputed ad hoc per lender conversation with inconsistent constraint sets.
- **Manual process today:** Scratch Excel: apply LTV cap, ICR at stressed rate, debt yield; take the min; redo when any input moves.
- **AI-assisted workflow:** Standing capacity function: max proceeds under a named constraint set (each constraint's binding level shown); sensitivity of capacity to rates/value/NOI; capacity across a lender-terms matrix.
- **First prototype design:** Constrained sizing solver (already needed for Demo 03) + constraint-attribution display + terms-matrix UI.
- **Required inputs:** Asset NOI/cash flows, valuation, constraint sets (per lender type or user-defined), rate assumptions (labelled).
- **Expected outputs:** Max proceeds + binding constraint; capacity sensitivity table; proceeds by lender-terms profile.
- **Dashboard/interface concept:** Capacity gauge with binding-constraint callout; tornado of capacity sensitivity; lender profile comparison bars.
- **What can be automated:** Solving, attribution, sensitivity, comparison.
- **What must remain human judgment:** Whether a lender would actually lend at that level; constraint set realism.
- **Risks:** Capacity ≠ availability — must be framed as arithmetic, not market intelligence.
- **Failure modes:** Stressed-rate convention ambiguity (ICR at current vs stressed rate) producing incomparable numbers.
- **Validation method:** Constraint definitions displayed with formulas; hand-check suite.
- **Benchmark test:** 8 synthetic assets × 3 constraint sets: solver matches hand calcs exactly; binding constraint correctly attributed in 24/24 cases.
- **Why this could become valuable:** Used at the top of every deal funnel; simple, fast, and feeds Demos 03/06 naturally.

---

## Demo 19 — What-If Chat Analyst (Governed)

- **Name:** What-If Chat Analyst
- **Target user:** Senior deal-makers and IC members who don't operate models themselves.
- **Exact workflow pain:** Every "quick question" (what if rates hit 4%? what if the anchor tenant leaves?) becomes an analyst task with a day's latency.
- **Manual process today:** Ask analyst → analyst edits model → answer next day → follow-up question repeats the loop.
- **AI-assisted workflow:** Chat interface where NL questions are compiled to *engine operations only* (scenario runs, breakevens, sensitivities); the compiled operation is shown before execution; answers render as calculation results + assumption panel, never free-form invented numbers. Out-of-scope questions get "I can't compute that from the dataset."
- **First prototype design:** Tool-calling LLM restricted to engine API; operation-confirmation UX; refusal templates for out-of-scope.
- **Required inputs:** Deal/portfolio in engine format; engine API from Demos 01/09/10.
- **Expected outputs:** Computed answers with shown operations and assumptions; conversation log auditable.
- **Dashboard/interface concept:** Chat pane + "operation card" per answer (what was run, on what data, with what shocks) + result visual.
- **What can be automated:** Question → operation compilation, execution, visualization.
- **What must remain human judgment:** Everything interpretive; the system refuses opinion questions ("should we sell?") and routes them to humans.
- **Risks:** The flagship credibility risk: users will push it to speculate. Refusal discipline is the whole product.
- **Failure modes:** Plausible-sounding answer computed on wrong deal; question subtly mistranslated; user takes "calculation" as "advice."
- **Validation method:** 100-question test set incl. 25 out-of-scope traps; every answer must carry an operation card; trap questions must be refused.
- **Benchmark test:** ≥90% correct operation compilation on in-scope set; 100% refusal on out-of-scope traps; 0 numeric answers without operation cards.
- **Why this could become valuable:** Puts the engine in the hands of decision-makers directly; the governed design is the differentiator vs "chat with your spreadsheet" toys.

---

## Demo 20 — Release Pricing & Disposal Impact Analyzer

- **Name:** Release Pricing & Disposal Impact Analyzer
- **Target user:** Asset managers selling assets out of multi-asset facilities.
- **Exact workflow pain:** Selling one asset from a pooled facility triggers release pricing (e.g., 110–120% of allocated loan amount), covenant re-tests on the remaining pool, and prepayment costs — computed ad hoc and occasionally wrong at the worst moment (mid-transaction).
- **Manual process today:** Analyst reconstructs release mechanics from the facility agreement per disposal; remaining-pool covenants checked in a side model.
- **AI-assisted workflow:** Encode release mechanics per facility (structured form); for any candidate disposal (or combination), compute release price, prepayment amounts, remaining-pool covenant positions, and net equity proceeds; compare disposal sequences.
- **First prototype design:** Release calculator + pool re-test via engine + disposal sequence comparison table.
- **Required inputs:** Facility release provisions (structured), allocated loan amounts, asset valuations, remaining-pool cash flows.
- **Expected outputs:** Per-disposal: release price, prepayment, remaining covenants, net proceeds; sequence comparisons.
- **Dashboard/interface concept:** Asset list with "simulate disposal" toggles; live remaining-pool covenant panel; proceeds waterfall.
- **What can be automated:** All release/re-test arithmetic; sequence enumeration.
- **What must remain human judgment:** Sale decisions, pricing, lender consent likelihood.
- **Risks:** Release provisions are bespoke; encoding errors mid-transaction are costly (structured confirmation form mitigates).
- **Failure modes:** ALA vs market-value basis confusion; substitution rights ignored.
- **Validation method:** Structured mechanics form with worked-example confirmation ("for a £10m sale, release price would be £X — confirm this matches the agreement").
- **Benchmark test:** 5 synthetic facilities with different release archetypes × 3 disposals each: all 15 hand-worked release prices matched exactly.
- **Why this could become valuable:** Transaction-critical arithmetic with real money attached; infrequent but very high stakes per use.
