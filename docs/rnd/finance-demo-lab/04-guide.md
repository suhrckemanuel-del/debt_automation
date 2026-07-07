# /guide — Reproducing the Finance Demo-Generation Process

How Manuel can rerun this process — for a new domain (e.g., equity portfolio workflows), a new persona, or a refresh of this track — and get comparable-quality output. The process is a pipeline of six stages; each stage has a prompt pattern, a quality bar, and a known failure mode to watch for.

---

## Stage 0 — Fix the ground rules first (the Credibility Rule)

Before generating anything, write the epistemic constraints and inject them into *every* subsequent prompt:

> 1. Never state facts the system cannot verify. 2. Label synthetic data SYNTHETIC. 3. Show assumptions wherever a result depends on them. 4. Separate Calculation (deterministic) from Judgment (interpretation) in every recommendation.

**Why first:** if you add these after ideation, you get demos whose core value depends on pretending (e.g., "AI predicts refi spreads") and you have to throw them away. Injected first, every idea is shaped around what is honestly computable.

**Failure mode to watch:** the rule decays over long generations — later ideas quietly drop the assumption panels. Re-state the rule in each stage's prompt.

## Stage 1 — Persona and pain inventory

Write down (a) who the user is, concretely (title, what their week looks like), and (b) a raw list of workflow pains in their own vocabulary ("maturity wall", "covenant headroom" — not "data silos"). 10–15 pains is enough. Source: your own domain knowledge, or 30 minutes with a practitioner.

**Quality bar:** each pain must name a *manual process that exists today*. If you can't describe the current Excel/email/PowerPoint ritual, it's not a validated pain, it's a guess.

## Stage 2 — Wide ideation with a fixed template (the 20)

Generate ~20 concepts, each forced through the same field template:

`name / target user / exact pain / manual process today / AI-assisted workflow / first prototype design / required inputs / expected outputs / interface concept / automatable / must-stay-human / risks / failure modes / validation method / benchmark test / why valuable`

Three fields do the real filtering work — don't skimp on them:
- **failure modes** — forces you to imagine the demo going wrong in front of a practitioner;
- **benchmark test** — forces a *falsifiable* pass/fail (numbers, counts, tolerances), which is what separates a demo from a slide;
- **must-stay-human** — enforces the Calculation/Judgment split at design time.

**Quantity discipline:** at ~idea 12 you run out of obvious ones; ideas 13–20 are where the non-obvious concepts appear (in this run: the release-pricing analyzer, the amortization auditor). Push through.

**Failure mode:** duplicates in disguise (a "downside generator" and a "stress copilot" can be the same engine). Fine at this stage — dedupe at ranking, not during ideation.

## Stage 3 — Rank with explicit criteria, then override with a portfolio argument

Score every idea 1–5 on: **Impact** (value if it works), **Feasibility** (weeks not months), **Credibility** (demoable without pretending — deterministic math scores high, market-data or document-extraction dependencies score low), **Risk** (inverted; 5 = low).

Then — important — *don't pick the top 5 by score alone.* Apply two portfolio filters:
1. **Shared substrate:** prefer a set that runs on one dataset and one calc engine; five demos then cost little more than two.
2. **Coherent story:** the set should narrate the user's actual workflow (monitor → see the wall → decide → interrogate).

Document any override explicitly (here: Refi Optimizer pulled up despite a mediocre score because it's the highest-stakes decision; Breakeven/Sensitivity merged because they're features, not products).

## Stage 4 — Deep-dive the winners

For each of the top 5, produce: product brief, minute-by-minute demo flow, synthetic dataset spec, core calculations (actual formulas), UI sketch in words, evaluator checklist, risks & mitigations, next build step.

Two disciplines make this stage worth doing:
- **Design the synthetic dataset once, shared, with engineered events** (seeded breaches, a hedge cliff, stale valuations, deliberate data errors). The dataset *is* the demo script — every "wow moment" is an engineered feature of the data.
- **The demo flow is written for a skeptical practitioner**, so it must include the moment where the system shows what it *doesn't* know (freshness flags, "not in dataset" refusals, confirmation gates). That moment builds more trust than any correct number.

## Stage 5 — Critic gauntlet

Run five critic passes with distinct personas — practitioner, risk/compliance, implementation, commercial, simplicity — each producing strengths, concerns, and *required changes*. Then write a synthesis table: change / source / adopted-or-rejected.

Rules that make critics useful instead of decorative:
- Give each critic a concrete persona ("15 years on a capital-markets desk"), not a job title.
- Require each to demand **changes**, not just observations.
- Let the **simplicity critic go last and give it teeth** — in this run it correctly collapsed the five-demo build into one three-tab app. Expect it to cut ~40% of scope; if it doesn't, it wasn't ruthless enough.
- Adopt or reject each change *in writing*. An unadjudicated critique is theater.

## Stage 6 — Converge on the first build

The output of the whole pipeline is one paragraph: *what gets built first and why*. Here:

> One prototype app, three tabs (Stress Test Copilot, Covenant Headroom Radar, Breakeven/Sensitivity), on one deterministic calc engine and one synthetic dataset (SynthPort), engine built and golden-file-tested against hand-built Excel references *before* any UI or LLM work; LLM confined to NL→scenario translation behind a confirmation gate; run manifests on every output. Maturity Wall and Refi Optimizer are specced phase-2 modules.

If you can't compress to one such paragraph, return to Stage 5.

---

## Prompt skeleton (copy-paste to rerun)

```
You are an autonomous [DOMAIN] workflow R&D lab.
Ground rules: [Credibility Rule, verbatim].
Persona: [Stage 1 output].
Pains: [Stage 1 list].

1. Generate 20 demo concepts using this template: [Stage 2 fields].
2. Score all 20 on impact/feasibility/credibility/risk (1–5), show the table,
   then select a top 5 optimizing for shared substrate + coherent story;
   document any override of the raw scores.
3. For each of the top 5: product brief, demo flow, synthetic dataset spec
   (with engineered events), core calculations with formulas, UI sketch in
   words, evaluator checklist, risks/mitigations, next build step.
4. Run five critics ([personas]); each must demand changes; produce an
   adopted/rejected synthesis table.
5. State the first build in one paragraph.
```

## Artifacts this run produced

- [01-demo-concepts.md](01-demo-concepts.md) — the 20 concepts, full template each.
- [02-ranking-and-top5.md](02-ranking-and-top5.md) — scoring table, selection rationale, five deep dives, shared build order.
- [03-critic-reviews.md](03-critic-reviews.md) — five critic passes + adopted-changes synthesis (this is where the build scope was cut to one app).
- This guide.
- [05-security-layer.md](05-security-layer.md) — security posture per demo (light, all 20) + in-depth exposure analysis, talk tracks, and 3-phase implementation paths for the top 5. Added after prospect feedback (2026-07-07) that data confidentiality is the main adoption blocker.
- [06-security-extension-guide.md](06-security-extension-guide.md) — repeatable 6-step method to apply the same security treatment to the other 15 concepts or a new domain.

## Practical tips learned in this run

1. **Credibility scoring quietly does the strategic work.** Everything that survived to the top 5 is deterministic-math-first; everything extraction- or market-data-dependent sank. That's not bias — it's the honest boundary of what demos well without pretending.
2. **The calc engine is the product; the AI is the interface.** Budget accordingly (implementation critic: engine is 80% of the work).
3. **Benchmark tests written at ideation become pilot acceptance criteria later** (commercial critic) — write them with numbers from day one.
4. **Keep this track physically separate** from the existing product's docs (here: `docs/rnd/finance-demo-lab/`) so exploration never contaminates the shipping roadmap.
