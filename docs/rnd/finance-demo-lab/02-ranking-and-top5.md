# Ranking & Top-5 Deep Dives

**Scoring:** each criterion 1–5. *Impact* = value if it works; *Feasibility* = buildable as a credible prototype in weeks not months; *Credibility* = can be demoed without pretending to know unverifiable facts (deterministic math + labelled assumptions score high, market-data-dependent or extraction-dependent score lower); *Risk* = 5 means LOW risk (inverted so higher total = better).

| # | Demo | Impact | Feasibility | Credibility | Risk (5=low) | Total |
|---|------|--------|-------------|-------------|--------------|-------|
| 01 | Stress Test Copilot | 5 | 4 | 5 | 4 | **18** |
| 02 | Covenant Headroom Radar | 5 | 4 | 5 | 4 | **18** |
| 04 | Debt Maturity Wall Monitor | 4 | 5 | 5 | 4 | **18** |
| 09 | Breakeven Solver | 4 | 5 | 5 | 5 | **19** |
| 10 | Sensitivity Matrix Generator | 3 | 5 | 5 | 5 | **18** |
| 03 | Refinancing Window Optimizer | 5 | 3 | 4 | 3 | 15 |
| 05 | Hedge Coverage Ladder | 4 | 4 | 4 | 4 | 16 |
| 18 | Debt Capacity Sizer | 4 | 5 | 4 | 4 | 17 |
| 07 | Downside Case Generator | 4 | 4 | 4 | 4 | 16 |
| 13 | Portfolio Early-Warning Flags | 4 | 4 | 4 | 4 | 16 |
| 16 | Rate Scenario Pack Generator | 4 | 4 | 4 | 3 | 15 |
| 14 | Amortization & Fee Auditor | 3 | 4 | 5 | 3 | 15 |
| 17 | Reporting Pack Assembler | 4 | 3 | 4 | 4 | 15 |
| 12 | IC Debt Memo Drafter | 3 | 4 | 4 | 4 | 15 |
| 19 | What-If Chat Analyst | 5 | 3 | 3 | 3 | 14 |
| 15 | Cash Trap / Sweep Simulator | 3 | 3 | 4 | 3 | 13 |
| 06 | Term Sheet Comparator | 4 | 3 | 3 | 3 | 13 |
| 11 | Lender Q&A Pack Builder | 4 | 3 | 3 | 2 | 12 |
| 20 | Release Pricing Analyzer | 3 | 3 | 4 | 3 | 13 |
| 08 | Assumption Registry | 4 | 3 | 3 | 3 | 13 |

**Selection note (not purely by score):** 09 and 10 score high but are features, not products. The top 5 below are chosen as the highest-scoring set that (a) shares one calc engine and one synthetic dataset, so five demos cost little more than two, and (b) forms a coherent story: *know your risk (02, 01) → know your wall (04) → decide (03) → interrogate (09/10 folded in as engine features)*. Demo 03 is pulled up despite its score because refinancing is the highest-stakes decision the target user makes, and its riskiest parts (market data) can be fenced with the assumption-labelling discipline.

## Top 5
1. **Stress Test Copilot** (01)
2. **Covenant Headroom Radar** (02)
3. **Debt Maturity Wall Monitor** (04)
4. **Refinancing Window Optimizer** (03)
5. **Breakeven & Sensitivity Engine** (09 + 10, merged into one demo surface)

All five run on one shared foundation: **the SynthPort dataset** (synthetic portfolio, defined once, below) and **one deterministic calc engine**. LLMs never compute; they translate intent and draft narrative.

---

# Deep Dive 1 — Stress Test Copilot

## Product brief
Portfolio stress testing as a governed, repeatable batch process instead of 120 manual Excel edits. Users describe scenarios in plain language; the system compiles them to explicit shock parameters (user-confirmed), runs a deterministic engine across the portfolio, and returns covenant outcomes with breach timing. Positioning: "your stress run goes from a week to an hour, and every number is reproducible."

## Demo flow (12 minutes)
1. Open portfolio view — 12 synthetic deals, "SYNTHETIC DATA" banner visible.
2. Type: *"Rates plus 200bp from Q3, ERV down 10% on offices only, and the top tenant in Deal Meridian vacates with a 12-month void."*
3. System shows the **parsed shock table** (3 shocks, parameters, affected deals) — presenter confirms, highlighting that nothing runs unconfirmed.
4. Run (<10s). Heatmap appears: deals × scenarios, colored by minimum ICR headroom.
5. Click the red cell: Deal Meridian breaches ICR in Q2-2027; trajectory chart with base vs stressed; assumption panel alongside.
6. Show the auto-drafted summary — Calculation block (facts) and Judgment block (watermarked "AI draft — review").
7. Rerun with the ERV shock at −15% to show iteration speed.

## Sample synthetic dataset (SynthPort — shared by all five demos)
- **12 deals**, 3 funds, 3 jurisdictions (UK/DE/NL), sectors: office ×4, logistics ×4, retail ×2, resi ×2.
- **facilities.csv:** deal_id, lender, currency, balance (£15m–£120m), margin (150–350bp), index (SONIA/EURIBOR), amortization (bullet/1% pa), maturity (2026-11 … 2030-06), extension options (0–2 ×1yr with conditions), prepayment terms (archetype id).
- **covenants.csv:** deal_id, type (ICR/DSCR/LTV/debt-yield), level incl. stepdowns, test frequency, cure rights.
- **cashflows.csv:** deal_id, quarterly: gross rent, opex, capex, NOI for 2026Q3–2031Q4 base case; tenancy concentration (top-tenant % of rent, lease expiry).
- **hedges.csv:** deal_id, type (swap/cap), notional schedule, rate/strike, maturity.
- **valuations.csv:** deal_id, value, yield, as-of date (some deliberately stale to demo freshness flags).
- **Engineered features:** 2 deals that breach under +200bp; 1 that breaches only under combined shock; 1 near-term maturity with weak refi metrics; 1 hedge cliff in 2027.

## Core calculations
- Interest: balance × (index path + margin) × day count; hedged portion: swap → fixed, cap → min(index, strike) + strike-adjusted.
- ICR = NOI / interest; DSCR = NOI / (interest + scheduled amort); LTV = balance / stressed value; debt yield = NOI / balance.
- Value under yield shock: V = NOI_stab / (yield_base + shock). Rent shocks flow to NOI with re-letting lag (void months, then ERV level).
- Breach detection: first test date where covenant < level (respecting stepdowns); headroom = (metric − level)/level.
- Scenario JSON schema: `{shocks: [{driver, magnitude, scope, start}], meta}` — the only interface between LLM and engine.

## UI/dashboard sketch (words)
Left rail: scenario list (saved + new). Center: NL input box → parsed-shock confirmation table (driver / magnitude / scope / start, edit-in-place) → RUN. Below: heatmap grid, deals as rows, scenarios as columns, cell = worst headroom %, red where breached. Right panel on cell click: covenant trajectory chart (base dotted, stressed solid, covenant level as line), assumption list with as-of stamps, "SYNTHETIC" watermark. Bottom: draft narrative with Calculation/Judgment split.

## Evaluator checklist
- [ ] Parsed shocks match the NL intent exactly (test 10 phrasings incl. ambiguous ones — ambiguity must surface as a question, not a guess).
- [ ] Engine outputs match reference Excel for 5 deals × 3 scenarios to <0.1%.
- [ ] No run executes without shock confirmation.
- [ ] Every output screen shows assumptions + synthetic label.
- [ ] Narrative contains no number not present in engine output.
- [ ] Breach dates respect covenant test frequency (no mid-quarter breaches for quarterly-tested covenants).

## Risks & mitigations
- **NL mistranslation** → confirmation table gate; ambiguity triggers clarifying question.
- **Engine ≠ user's Excel** → position as parallel-check tool first; reconciliation mode showing per-line differences.
- **Generic covenant math vs bespoke definitions** → covenant definitions are data (per-facility formula config), not code constants.
- **Users read stress results as forecasts** → persistent "conditional on stated shocks" framing in every export.

## Next build step
Build the calc engine + SynthPort dataset + golden-file test suite (engine vs hand-built Excel reference for 3 deals). No UI, no LLM yet — the engine's trustworthiness is the whole foundation.

---

# Deep Dive 2 — Covenant Headroom Radar

## Product brief
Forward-looking covenant monitoring: project every covenant 8–12 quarters, show when headroom thins, rank the watch list. Converts covenant compliance from backward-looking certificates to early warning. Positioning: "no covenant surprise should ever have been computable in advance."

## Demo flow (8 minutes)
1. Portfolio grid: 12 deals × covenants, cells show quarters-until-warning, sorted worst-first.
2. Top of list: Deal Bruma — LTV headroom shrinking as a 2027 covenant stepdown approaches. Click through: trajectory chart shows headroom crossing the 15% warning line in Q1-2027, breach Q3-2027 *if base case holds*.
3. Show assumption panel: valuation as-of date is 11 months old — flagged amber. Presenter: "the radar tells you both the projection and how much to trust it."
4. Toggle to a mild-stress overlay (from Demo 1 engine) — watch list reorders.
5. Show drafted watch-list note: Calculation (dates, numbers) vs Judgment (suggested lender-engagement timing, watermarked draft).

## Sample synthetic dataset
SynthPort, plus: covenant stepdown schedules on 4 deals; one deal with equity cure rights (2 cures remaining); valuation as-of dates ranging 1–14 months old; a synthetic "history" (8 past quarters of compliance certificates) for back-testing the radar's flags.

## Core calculations
- Same engine; run base case forward, evaluate covenant at each future test date, headroom % time series.
- First-warning quarter: min t where headroom < threshold (user-set, default 15%).
- Watch-list rank: composite of (time to warning, severity slope, data staleness penalty).
- Cure-adjusted severity: breach severity net of available cures, displayed separately (never silently netted).

## UI/dashboard sketch (words)
Main grid: rows = facility, columns = covenant type; cell = sparkline of projected headroom + "Q until warning" number; red/amber/green. Click → full trajectory chart with covenant level (incl. stepdown steps drawn), warning band, test-date markers. Right: assumption panel with freshness badges (green <3mo, amber <12mo, red older). Header: "Projections are conditional on the base case shown — SYNTHETIC DATA."

## Evaluator checklist
- [ ] All 3 seeded future breaches flagged ≥2 quarters ahead in back-test.
- [ ] Stepdowns visibly drawn and correctly applied.
- [ ] Stale valuations flagged, and staleness affects watch-list rank.
- [ ] Cure rights shown as mitigation, never hidden in the numbers.
- [ ] Zero flags presented as predictions ("will breach") — language is conditional everywhere.

## Risks & mitigations
- **False precision from stale inputs** → freshness badges + staleness penalty in ranking.
- **Alert fatigue** → user-tunable threshold; weekly digest not real-time noise.
- **Bespoke covenant formulas** → per-facility covenant config (shared with Demo 1).
- **Overlap perception with Agreement Intelligence** → radar consumes covenant *definitions* as structured data; it does not extract them from documents.

## Next build step
Extend the Demo-1 engine with time-series projection + test-date calendar + stepdown handling; build the back-test harness on synthetic history before any UI.

---

# Deep Dive 3 — Debt Maturity Wall Monitor

## Product brief
One normalized facility register → the CIO-level maturity wall: what matures when, across funds/currencies/lenders, base vs fully-extended, with hedge roll-offs overlaid and refi requirements sized. Low modelling risk, high visibility; also the Trojan horse that forces the clean dataset every other demo needs.

## Demo flow (7 minutes)
1. Load 3 deliberately messy synthetic source spreadsheets → ingestion report: 2 duplicates merged, 3 stale balances flagged, 1 missing extension condition — "the system tells you what it doesn't know."
2. The wall: stacked bars by quarter, colored by fund. Toggle "extensions exercised" — the 2027 tower halves.
3. Overlay hedge roll-off line: the 2027 refi cluster coincides with a hedge cliff — compound exposure visible in one view.
4. Click the 2027 bar → facility list with refi metrics (current LTV/debt yield vs illustrative refi constraints, labelled).
5. AI-drafted quarterly commentary with every figure traceable; Calculation vs Judgment split.

## Sample synthetic dataset
SynthPort facility register exported into 3 conflicting "source" spreadsheets (per-fund trackers) with 6 seeded errors: duplicate facility under two names, stale balance, missing extension, FX at wrong rate, maturity typo, one facility absent from the master.

## Core calculations
- Normalization + entity resolution (rule-based matching, human-confirmed merges).
- Wall aggregation by period/fund/currency/lender; FX at stamped rates.
- Extension-adjusted maturities as a second scenario, conditions listed.
- Refi requirement per cluster: balance vs illustrative capacity (Demo-18 sizing math, constraints labelled "illustrative").
- Concentration: max 12-month rolling maturity %, per-lender share.

## UI/dashboard sketch (words)
Single page. Top: KPI strip (total debt, WAM, % maturing in 24m, largest 12m window). Center: stacked bar wall, quarter granularity, fund colors, extension toggle, hedge roll-off line overlay. Bottom: sortable facility table with freshness badges per row. Every export footer: data as-of stamps + SYNTHETIC label.

## Evaluator checklist
- [ ] All 6 seeded data errors surfaced in ingestion report.
- [ ] Wall totals reconcile to source spreadsheets after documented merges.
- [ ] Extension toggle only moves facilities whose options are recorded, conditions displayed.
- [ ] No refi "feasibility" claims — only arithmetic vs labelled illustrative constraints.
- [ ] Freshness visible per facility.

## Risks & mitigations
- **Stale register → confident wrong wall** → freshness stamps mandatory, staleness summary in header.
- **Entity resolution errors** → merges require human confirmation, never silent.
- **"This is just a spreadsheet"** → true and fine: the wedge is the validated dataset + always-current view; extension/hedge overlays are the demo moments.

## Next build step
Define the facility register schema + ingestion validator with the seeded-error test set; build the wall chart on top. Fastest of the five to a complete demo.

---

# Deep Dive 4 — Refinancing Window Optimizer

## Product brief
For each facility, compute refinance-vs-hold economics across candidate refi dates and labelled rate/spread assumptions: break costs, constrained new proceeds, all-in cost NPV delta, breakeven refi spread. The system does the arithmetic exhaustively; the human owns the rate view and the lender read. Positioning: "walk into the refi discussion with the full decision grid, not one scratch scenario."

## Demo flow (10 minutes)
1. Deal Kestrel: matures 2027-09, swap ends 2027-03, 2 extension options. Timeline view shows all three events.
2. Assumptions sidebar: refi margin 250bp *(user assumption)*, curve = illustrative forwards *(labelled, as-of shown)*. Presenter edits margin to 275bp live — grid recomputes.
3. NPV-delta curve by refi date: refinancing before the swap roll-off is negative (break cost dominates); a window opens Q2-2027. The chart annotates *why* (component waterfall: break cost, fees, margin delta, carry).
4. Breakeven view: "refi now beats hold if achievable margin ≤ 231bp" — a number to negotiate against.
5. Constrained sizing at each date: proceeds capped by ICR at stressed rate; equity top-up requirement shown where proceeds < balance.
6. Draft memo: Calculation block (grid, breakevens) vs Judgment block (timing view, watermarked).

## Sample synthetic dataset
SynthPort + prepayment archetypes per facility (fixed fee 1%/0.5%/0%, spens on one, make-whole on one), swap MTM proxy (engine-computed from illustrative curve, labelled), refi constraint set (65% LTV, 1.4× ICR at rate+100bp stress, 8% debt yield).

## Core calculations
- Break cost: archetype-specific (fee % of balance; make-whole = PV of remaining margin over reference; swap break = PV of (fixed − forward) × notional schedule).
- Hold cost to date t: interest + fees on current terms. Refi cost from t: new margin/fees on new sizing.
- NPV delta discounted at labelled rate; component decomposition retained for the waterfall display.
- Constrained sizing: max L s.t. L/V ≤ LTV_max, NOI/((idx_stress+m)·L) ≥ ICR_min, NOI/L ≥ DY_min → binding constraint reported.
- Breakeven margin: solve NPV delta = 0 for refi margin (bisection; residual check).

## UI/dashboard sketch (words)
Per-facility page. Top: event timeline (maturity, call windows, extension deadlines, hedge roll-offs). Middle: NPV-delta-by-refi-date curve with shaded "window"; hover → component waterfall. Sidebar (always visible): every market assumption with source/as-of or "USER ASSUMPTION" chip, all editable. Bottom: sizing table by date with binding-constraint column; breakeven margin callout box.

## Evaluator checklist
- [ ] All 4 break-cost archetypes match hand-worked references.
- [ ] No market number appears without a provenance chip.
- [ ] Editing an assumption recomputes everything (no stale panels).
- [ ] Breakeven margins re-verify by substitution.
- [ ] Judgment text never states a rate view as fact.
- [ ] Sizing binding-constraint attribution correct in all grid cells.

## Risks & mitigations
- **Bespoke prepayment clauses** → archetype library + structured entry with worked-example confirmation; unknown archetype = "cannot compute, enter mechanics."
- **Assumptions read as forecasts** → provenance chips, editable-by-design, breakeven framing ("what would need to be true") instead of point predictions.
- **Hedge break costs omitted/wrong** → swap MTM always displayed as its own line, labelled model-derived proxy.
- **Scope creep into market data feeds** → v1 is strictly user-supplied/illustrative assumptions.

## Next build step
Implement the break-cost archetype library with the hand-worked reference suite; then the sizing solver (shared with Demo 18); grid and UI after both pass.

---

# Deep Dive 5 — Breakeven & Sensitivity Engine

## Product brief
The interrogation layer on the shared engine: any metric, any driver — two-way sensitivity matrices with breach frontiers, and breakeven solving ("what SONIA breaks ICR?") with residual verification. Memo-ready exports. This is the demo that makes the engine *feel* alive in a meeting, and the natural seed of the What-If Chat later.

## Demo flow (6 minutes)
1. Deal Meridian: pick drivers (ERV %, exit yield) × metric (min ICR headroom) → 11×11 matrix in ~2s, breach frontier drawn as a red boundary through the grid.
2. Switch metric to first-breach date — same grid, new lens, instant.
3. Breakeven panel: "distance to breakeven" gauges — SONIA +187bp breaks ICR, value −18% breaks LTV, top tenant + 4 more units vacating breaks DSCR. Each shows the verification residual ("breakeven re-checked: ICR = 1.400× at SONIA 6.12%").
4. Portfolio view: 12 deals ranked by smallest distance-to-breakeven — a one-slide risk summary.
5. Export the matrix as a formatted table with auto-caption listing base case + assumptions.

## Sample synthetic dataset
SynthPort unchanged; driver presets per sector (office: ERV/yield/void; logistics: ERV/yield; resi: rent growth/yield); one deal engineered with a cash-sweep kink making ICR non-monotonic in rates — to demo honest "multiple solutions" handling.

## Core calculations
- Matrix: engine run per cell (same code path as single runs — no shortcut approximations).
- Breakeven: bisection per driver with monotonicity pre-scan (sample 8 points; if non-monotonic → report all sign changes as candidate breakevens, never a single silent answer).
- Distance-to-breakeven: (breakeven − base)/base, normalized for ranking.
- Cliff detection: adjacent-cell breach transitions with headroom gap > threshold → suggest finer step.

## UI/dashboard sketch (words)
Deal page, two tabs. **Sensitivity:** driver dropdowns + range sliders, live matrix (green→red by headroom, breach frontier line), metric switcher, export button. **Breakeven:** gauge row per driver (base marker, breakeven marker, distance %), verification line under each, binding-covenant tag. Portfolio tab: ranked bar chart of min distance-to-breakeven per deal. Persistent assumption footer + SYNTHETIC watermark.

## Evaluator checklist
- [ ] Matrix cells identical to standalone engine runs (sampled).
- [ ] All breakevens re-verify within tolerance; residual displayed.
- [ ] Non-monotonic trap deal returns multiple candidates, not one number.
- [ ] Cliff detection fires on the seeded cliff case.
- [ ] Exports carry base case + assumptions in the caption automatically.

## Risks & mitigations
- **Wrong-root convergence** → monotonicity pre-scan + residual display.
- **Grid hides cliffs** → cliff detector + step-refinement suggestion.
- **Feature-not-product** → accepted: this ships as the interrogation surface of the engine, bundled with Demos 1/2, not sold alone.

## Next build step
Bisection solver + monotonicity pre-scan with the non-monotonic trap deal as a unit test; matrix runner is trivial once the engine exists.

---

## Shared build order (all five)
1. **SynthPort dataset** (with engineered breaches, cliffs, stale rows, messy source exports) — one week.
2. **Calc engine + golden-file tests vs hand-built Excel** — the trust foundation.
3. Demo 3 (wall) first — no projection risk, fastest win; then Demo 2 → 1 → 5 → 4.
4. LLM layers (NL→scenario, narrative drafting) last, always behind confirmation gates.
