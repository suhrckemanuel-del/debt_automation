# F-002 Deterministic Covenant Calculator Decision

**Decision date:** 5 July 2026

**Decision:** PROCEED with a bounded, local, synthetic-only LTV calculation
foundation.

## Purpose

Test whether a reviewer can move from source-backed agreement terms and
source-backed financial inputs to a reproducible arithmetic position without
confusing calculation with legal judgment.

The first question is:

> For the synthetic 30 June 2026 Test Date, what is the calculated
> Loan-to-Value Ratio, how far is it from the selected contractual threshold,
> and which limited relief may require human review?

This is a deterministic covenant calculator, not a predictive financial model.

## Authorized scope

- Add an explicit synthetic Loan-to-Value Ratio definition to the synthetic
  Facility Agreement.
- Add a synthetic loan balance statement and synthetic valuation certificate.
- Calculate LTV, percentage-point headroom, debt capacity, and a small set of
  clearly labelled scenarios with Python `Decimal`.
- Resolve the selected threshold, amendment period, and limited waiver through
  the existing agreement hierarchy engine.
- Persist immutable, source-linked model versions and an atomic active-version
  pointer in the local adapter and version the future hosted schema.
- Expose a narrow typed engine endpoint and a read-only reviewer surface.
- Require human review and avoid any conclusion of compliance, breach, default,
  waiver satisfaction, or transaction permission.

## Not authorized

- Real or confidential financial inputs or agreements
- Spreadsheet, accounting-system, or portfolio integrations
- Cloud deployment, production authentication, or object uploads
- LLM-generated formulas, interpretation, or conclusions
- DSCR, debt yield, forecasting, Monte Carlo analysis, or underwriting
- Automated legal, investment, accounting, tax, or commercial judgment

## Trust boundaries

1. Contractual facts come from reviewed agreement passages and the existing
   hierarchy resolver.
2. Financial facts come from immutable input passages with amount, currency,
   effective date, and exact quotation.
3. Arithmetic is deterministic and uses decimal strings; binary floating-point
   values are not accepted.
4. Scenario changes are assumptions and must never overwrite or masquerade as
   source facts.
5. Full precision controls comparisons. Display rounding is presentation only.
6. Missing formula, source, currency match, positive valuation, or applicable
   threshold produces an explicit abstention.
7. A limited waiver remains separate from the contractual threshold.

## Synthetic baseline

- Test Date: 30 June 2026
- Evaluation date: 2 July 2026
- Loan principal: EUR 71,000,000
- Valuation: EUR 100,000,000
- Calculated LTV: 71.0%
- Selected threshold: 70.0% under Amendment Letter No. 1
- Arithmetic distance: -1.0 percentage point
- Observation: above the selected threshold and inside the waiver's stated
  70.0%-72.0% numeric range for that Test Date
- Required conclusion: human review required

## Acceptance

- Formula, threshold, debt, and valuation each have document, locator, page,
  passage ID, and exact supporting passage.
- Inputs are strict decimal strings with matching currency and valid dates.
- Zero or negative valuation, negative debt, currency mismatch, future-dated
  input, and missing mappings fail closed.
- Boundary comparisons use unrounded decimal values.
- 31 December 2026 selects 70.0%; 1 January 2027 selects 65.0%.
- The 72.0% waiver ceiling is never presented as the threshold.
- Persisted model versions cannot be updated or deleted and activation is
  atomic.
- Identical inputs and versions produce identical canonical calculation data.
- The reviewer surface survives refresh and local process restart.
- Existing F-001 tests, benchmark, and citation checks continue to pass.

## Evidence status

This owner-directed slice is for prototype learning only. It is not evidence of
broader demand validation. Every added entity, document, amount, and reaction
is synthetic.
