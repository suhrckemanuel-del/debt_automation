# Completion Report — Gate 0 Baseline + F-002 Slice Verification

**Date:** 5 July 2026
**Branch:** `codex/financial-modeling-foundation` (all work uncommitted)
**Scope:** Verify the trusted baseline and the in-flight F-002 deterministic
covenant calculator slice; repair the one stale validator; produce the Gate 1
authorization checklist and threat model as unapproved drafts.

## Authorization state (unchanged by this session)

```
DEMAND_VALIDATION_COMPLETE                = NO
REAL_OR_CONFIDENTIAL_DOCUMENTS_AUTHORIZED = NO
CLOUD_DEPLOYMENT_AUTHORIZED               = NO
LLM_OR_EXTERNAL_AI_AUTHORIZED             = NO
PRODUCTION_USE_AUTHORIZED                 = NO
CURRENTLY_AUTHORIZED_DATA                 = SYNTHETIC_ONLY
```

F-002 (bounded synthetic LTV calculator) is separately authorized by
`docs/implementation/financial_model_foundation.md` (5 July 2026, PROCEED).

## Exact commands and results

| Command | Result |
|---|---|
| `python -m unittest discover -s tests -p "test_*.py" -v` | **Ran 50 tests — OK** (test_system: 31, test_financial_model: 14, test_engine_api: 5) |
| `python app.py benchmark` | **13/13 passed (100%)**, B001–B013 all PASS |
| `.\scripts\Test-Phase1.ps1` | **FAILED first run** (exit 1): "Expected exactly 3 Phase -1 source documents; found 5" — see fix below. **Exit 0 after fix.** Demand gate correctly reports not ready (0 of 5 serious sessions); this is expected, not a failure. |
| `.\tests\Test-Phase1.ps1` | **FAILED first run** (same root cause). After fix: **"Phase -1 validator tests passed: 16 assertions."**, exit 0 |
| `.\scripts\Test-ReviewerPackCitations.ps1` | **17/17 manifest entries pass, 0 errors**, exit 0 |
| `npm test` (apps/web) | **13/13 pass, 0 fail** (includes financial-model persistence, atomic activation, cross-actor authorization, demo reset) |
| `npm run lint` (apps/web) | **Clean, no findings** |
| `npm run build:synthetic` (apps/web) | **Build succeeds**; `/models` route present in output |
| Live engine check: `python app.py api --port 8791` + `GET /health` | `{"status": "ok", "contract_version": "1.2.0"}` |
| Live F-002 check: `POST /v1/workspaces/demo/models/ltv-calculations` with `{"model_id":"ltv-v1","scenario_id":null}` | See representative output below |

## Failed checks and their resolution

The only failure was the Phase -1 structural validator pinning the synthetic
corpus at exactly 3 documents. The F-002 decision explicitly authorizes two
additional synthetic documents (loan balance statement, valuation
certificate), and the Python registry test already asserts five. Both new
documents carry the required "Synthetic training material only" disclaimer.
Fix: `scripts/Test-Phase1.ps1` now expects exactly 5 documents with an
explanatory message. This is a structural-count update reflecting an
authorized corpus change, not a gold-answer edit.

## Representative F-002 output (verified live)

- `status`: `calculated_human_review_required`; `human_review_required`: true
- `outputs.ltv_percent`: `"71"` (full precision; display `"71.00%"`)
- `selected_threshold.percent`: `"70"` via `doc_amendment_001` Section 2.1
  (`amendment_active`: true) — the 72.0% waiver ceiling is **not** presented
  as the threshold
- `waiver_observation`: relevant for Test Date 2026-06-30, stated range
  70.0%–72.0%, `does_not_amend_threshold`: true
- `headroom_percentage_points`: `"-1"`; `arithmetic_status`:
  `above_selected_threshold`
- `formula.trace`: `71000000 / 100000000 * 100 = 71%`
- 5 sources, each with document ID, title, type, locator, page, passage ID,
  and exact supporting passage
- Encoding verified at the codepoint level: document titles contain a true
  U+2014 em dash end-to-end (apparent mojibake during inspection was a
  Windows console artifact, not a data defect)

## Files changed this session

- `scripts/Test-Phase1.ps1` — corpus count 3 → 5 (fix described above)
- `docs/implementation/real_document_authorization.md` — **new**, Gate 1
  checklist, explicitly `DRAFT — NOT APPROVED`, every item
  `OWNER DECISION REQUIRED`
- `docs/security/threat_model.md` — **new**, threat model with current data
  flow, trust boundaries B1–B5, threats T1–T18, misuse cases; explicitly
  `DRAFT — NOT APPROVED`
- `artifacts/fable/f002-baseline-verification-report.md` — this report

All other modified/untracked files on the branch predate this session and
belong to the F-002 slice built earlier; none were reworked.

## Assumptions and unresolved risks

- The branch remains entirely uncommitted (23+ modified/untracked files).
  Risk: a single working-tree loss destroys the F-002 slice. Committing is
  the owner's call.
- The Supabase migration `202607050001_financial_model_foundation.sql` is
  versioned but untested against a live instance (cloud deployment is not
  authorized, so forward/rollback testing is deferred by design and noted as
  an open item in the threat model era of Gate 1).
- Gate 1 documents are drafts only; every consequential decision is left to
  the owner. No defaults were chosen.

## Confidential-data confirmation

No real document, entity, credential, provider, LLM, or cloud service was
introduced. Every value in this session's inputs, outputs, fixtures, and
documents is synthetic or structural.
