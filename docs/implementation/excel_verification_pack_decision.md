# F-002.1 Excel Verification Pack Decision

**Decision date:** 5 July 2026

**Decision:** PROCEED with a bounded, export-only, macro-free, synthetic-only
Excel verification workbook generated from persisted covenant model versions.

## Relationship to earlier decisions

`docs/implementation/financial_model_foundation.md` excluded "spreadsheet,
accounting-system, or portfolio integrations". This record narrows that
exclusion for one direction only: the system may **generate** a static
verification workbook from an already-persisted model version. Spreadsheets
as an input, import, synchronization, or calculation authority remain
unauthorized.

## Purpose

Let a reviewer audit the covenant calculation in the tool they already trust.
The workbook shows every input with its exact source passage, recomputes the
arithmetic with visible Excel formulas, and compares that recomputation
against the engine's canonical values. The engine remains authoritative; the
workbook is a cross-check and evidence artifact, never a source of truth.

This also serves demand validation: the workbook is the artifact a
practitioner can react to in a discovery session.

## Authorized scope

- Generate a `.xlsx` workbook from one persisted, immutable model version
  using a local Python library. No macros, no external links, no VBA, no
  network access at generation or open time.
- Workbook contents:
  1. **Summary sheet** — model version ID, Test Date, evaluation date,
     calculated LTV, selected threshold and its source, headroom, arithmetic
     status, and the mandatory human-review statement.
  2. **Inputs sheet** — debt, valuation, threshold, and formula inputs as
     exact decimal strings, each with document title, locator, page, passage
     ID, and exact supporting passage.
  3. **Calculation sheet** — live Excel formulas recomputing LTV, headroom,
     maximum debt at threshold, debt capacity, and minimum valuation from the
     Inputs sheet.
  4. **Parity sheet** — engine canonical value beside the Excel
     recomputation with a delta column. Engine values are authoritative;
     the sheet states this explicitly.
  5. **Threshold resolution sheet** — why the selected threshold controls on
     the Test Date (original term, amendment period, step-down dates) and the
     limited waiver shown separately, never as the threshold.
  6. **Scenario sheets** (only if the model version is a scenario) — labelled
     assumptions, never presented as source facts.
- Record workbook provenance: generating engine version, model version ID,
  generation timestamp, and a SHA-256 digest of the produced file.
- Expose generation through the existing typed engine API and a download
  action on the reviewer surface.
- Add one local dependency for workbook generation (e.g. `openpyxl`).

## Not authorized

- Reading, importing, or ingesting any spreadsheet
- Macro-enabled or externally linked workbooks
- Live synchronization or bidirectional editing
- Real or confidential financial inputs or agreements
- Cloud storage, e-mail, or any transmission of the workbook by the system
- Presenting Excel recomputation as the authoritative value
- Any compliance, breach, default, or waiver-satisfaction conclusion

## Trust boundaries

1. The workbook is derived from a persisted immutable model version; it can
   never create or mutate one.
2. Every number on the Inputs sheet carries its exact citation, identical to
   the persisted source links.
3. Excel arithmetic is binary floating point; the engine's decimal values are
   canonical. The parity sheet must show both and label the delta as a
   floating-point artifact when non-zero.
4. Display rounding on the Summary sheet is presentation only; full-precision
   decimal strings appear on the Inputs and Parity sheets.
5. The human-review requirement and the waiver/threshold separation appear on
   every sheet where a conclusion could be misread.
6. A model version with any abstention state produces no workbook; generation
   fails closed with the abstention reason.

## Acceptance

- Generating twice from the same model version produces byte-identical
  content apart from the generation timestamp, or a documented deterministic
  mode for testing.
- The parity sheet delta is zero for the synthetic baseline
  (71,000,000 / 100,000,000 at 70.0%) for every metric whose exact value
  terminates: LTV, headroom, maximum debt at threshold, and debt capacity.
  Minimum valuation at threshold (71,000,000 / 0.7) is a repeating decimal;
  its delta is expected to be non-zero and must be labelled a
  floating-point/precision artifact, never a defect or a rounded
  "authoritative" value.
- A workbook opened with no warnings in Excel/LibreOffice: no macros, no
  external references.
- Citation fields in the workbook match the persisted model version exactly.
- The 72.0% waiver ceiling never appears in a threshold-labelled cell.
- Abstaining model versions refuse generation with a typed reason.
- All existing Python, web, benchmark, citation, and phase checks continue
  to pass.

## Evidence status

Owner-directed prototype slice for reviewer-trust learning and discovery
sessions. Synthetic data only. Not evidence of demand validation.
