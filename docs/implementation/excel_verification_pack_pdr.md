# F-002.1 Excel Verification Pack — Product Design Record

**Status:** implementation-ready design under `docs/implementation/excel_verification_pack_decision.md`.
**Builds on:** `docs/implementation/financial_model_foundation.md` (F-002 covenant calculator).
**Scope discipline:** this record narrows the decision into concrete cell
layouts, function signatures, and file lists. It authorizes nothing beyond the
decision record; if a design question is not answered by the decision, the
narrower reading wins.

## 1. Summary

The engine gains a pure, stateless module (`excel_pack.py`) that turns one
already-calculated LTV result — the same JSON shape returned by
`POST /v1/workspaces/{workspaceId}/models/ltv-calculations` and persisted as
`financial_model_runs.result_json` — into a six-sheet, macro-free `.xlsx`
workbook, exposed through a new typed engine endpoint that re-verifies every
citation against the corpus before generating bytes. The web app adds a
"Download verification pack" action next to the existing "Run calculation"
control on `/models`, which fetches the workbook from the local engine and
streams it to the browser without persisting the file anywhere. Determinism is
achieved by injecting a fixed `generated_at` timestamp for tests and computing
the SHA-256 provenance digest over the finished bytes rather than embedding it
in the file, avoiding the circularity of a file hashing itself.

## 2. Workbook specification

The workbook is generated from one calculation payload — the dict shape
produced by `AgreementIntelligenceEngine.calculate_ltv()` (Python) /
`CalculatedEngineLtv` (TypeScript, `engineLtvCalculationSchema`'s
`calculated_human_review_required` branch). All values placed on the
worksheet come from this payload; nothing is fetched from the registry or
re-derived at generation time except the source-citation lookup used for the
Threshold resolution sheet's citation text, which is already present verbatim
in `calculation["sources"]`.

### Citation role mapping (used by Inputs and Threshold resolution sheets)

`calculation["sources"]` is an unordered-in-principle list of citation dicts
(document_id, document_title, document_type, locator, page, passage_id,
supporting_passage, source_path). `excel_pack.py` must not rely on list
order; it identifies each citation's role by matching fields already in the
payload:

1. `debt_citation` — the source whose `(document_id, locator)` equals
   `calculation["source_inputs"]["debt_amount"]["document_id"]` /
   `["locator"]`.
2. `valuation_citation` — same match against
   `calculation["source_inputs"]["valuation_amount"]`.
3. `threshold_citation` — the source whose `(document_id, locator)` equals
   `calculation["selected_threshold"]["document_id"]` / `["locator"]`.
4. `waiver_citation` — present only if `calculation["waiver_observation"]` is
   not `null`: the one remaining source with `document_type ==
   "waiver_letter"`.
5. `definition_citation` — the one remaining source not matched above (its
   `document_type` is `"facility_agreement"` in the synthetic corpus).

If any of (1)-(3) has zero or more than one match, or (5) does not resolve to
exactly one remaining source, generation fails closed with
`WorkbookGenerationAbstained("Source citation set does not match the expected
calculation shape.")`. This is a defensive check, not expected to trigger for
a schema-valid payload.

### Number-format rule (load-bearing, easy to get wrong)

Every decimal-string field in `calculate_ltv_arithmetic()` output
(`financial_model.py`) is already scaled to display units — `ltv_percent`,
`threshold_percent`, and `headroom_percentage_points` are stored as `"71"`,
not `"0.71"`. Excel's built-in percentage number format (`0.00%`) multiplies
the underlying number by 100, which would turn `71` into `7100%`. All
percent-like numeric recomputation cells therefore use the **custom** format
`0.00"%"` (a literal suffix, no scaling), never the built-in `%` format code.
Currency-like numeric cells use `#,##0.00`. Every canonical (engine) decimal
string is written as a Python `str` with `number_format = "@"` (text), so
Excel never reinterprets or rounds it.

Dates (`test_date`, `evaluation_date`, input `effective_date`) are written as
literal ISO-8601 text (`number_format = "@"`), not Excel date serials, to
avoid locale-dependent D/M/Y reinterpretation. No formula performs date
arithmetic, so nothing is lost.

### Sheet 1 — Summary

| Row | A | B | Format / notes |
|---|---|---|---|
| 1 | `Excel Verification Pack — <calculation_purpose>` (merged A1:D1) | | title |
| 3 | Model | `ltv-v1 · v{model_version}` | text |
| 4 | Scenario | `scenario.label` (e.g. "Reported baseline") | text |
| 5 | Test Date | `test_date` | text `@` |
| 6 | Evaluation date | `evaluation_date` | text `@` |
| 7 | Calculated LTV | `outputs.ltv_display` (e.g. `"71.00%"`) | text; display rounding only |
| 8 | Selected threshold | `selected_threshold.percent` + `"%"` suffix, with a hyperlink-free citation label `"{threshold_citation.document_title}, {locator}"` | text |
| 9 | Headroom | `outputs.headroom_display` (e.g. `"-1 pp"`) | text |
| 10 | Arithmetic status | humanized `outputs.arithmetic_status` (see helper below) | text |
| 12 | (banner, merged A12:D14, red border) | `review_note` verbatim + fixed sentence: "This is not a conclusion of compliance, breach, default, waiver satisfaction, or transaction permission." | bold, wrapped |
| 16 | (shaded box, merged A16:D18) | If `waiver_observation` present: `"Limited waiver relief applies from {relief_above_percent}% up to {relief_up_to_percent}% for the {waiver_observation.test_date} Test Date only. This range is not the selected threshold."` Else: `"No waiver is relevant to this calculation."` | never placed in a cell labelled "Threshold" |
| 20 | Provenance | Engine version, model_id, model_version, scenario_id, generation timestamp (see §3) | text; SHA-256 digest is **not** written here (see §3) |

A helper `_status_label(status: str) -> str` renders
`status.replace("_", " ").replace("selected ", "")` (e.g.
`"above_selected_threshold"` → `"above threshold"`), mirroring the equivalent
inline transform already used in `apps/web/src/app/(product)/models/page.tsx`.

### Sheet 2 — Inputs

One row per field, columns:

| Col | Header | Content | Format |
|---|---|---|---|
| A | Field | `debt_amount` / `valuation_amount` / `threshold_percent` / `ltv_definition` | text |
| B | Canonical value (engine, exact) | the raw decimal string, e.g. `"71000000"` | `@` (text) |
| C | Recomputation value | `Decimal(B)` written as an openpyxl numeric cell | `#,##0.00` for amounts, `0.00"%"` for `threshold_percent` |
| D | Currency | `calculation["currency"]` (blank for `threshold_percent`/`ltv_definition`) | `@` |
| E | Effective date | input's `effective_date` (blank for `ltv_definition`) | `@` |
| F | Document title | citation `document_title` | `@` |
| G | Locator | citation `locator` | `@` |
| H | Page | citation `page` | integer, `0` |
| I | Passage ID | citation `passage_id` | `@` |
| J | Exact supporting passage | citation `supporting_passage`, wrapped | `@`, wrap text |

Rows: `debt_amount` (debt_citation), `valuation_amount` (valuation_citation),
`threshold_percent` (threshold_citation), and `ltv_definition` (the
`formula.expression` string as column B canonical text, no numeric column —
column C left blank, since a formula expression is not itself a number to
recompute; `definition_citation` supplies F-J).

Column C (numeric recomputation) is the only column the Calculation sheet's
formulas reference. Column B is authoritative for the Parity sheet and for
human reading; the two are computed independently in the writer (both from
the same source `Decimal`, but B as `decimal_string()` text and C as a float
cast) — never one converted into the other by an Excel formula, so a
corrupted numeric cell cannot silently alter the audited text value.

Footer row: the same review banner as the Summary sheet, plus: "Every
number above carries its exact document, locator, page, and quoted passage.
Compare this sheet to the Parity sheet before relying on the Calculation
sheet's arithmetic."

### Sheet 3 — Calculation

Live formulas, all referencing Inputs!C (numeric column) by cell address
(named ranges are avoidable given the fixed row layout; a future revision
may add them, out of scope here):

| Row | Label | Formula | Format |
|---|---|---|---|
| 2 | LTV % | `=Inputs!C2/Inputs!C3*100` | `0.00"%"` |
| 3 | Headroom (pp) | `=Inputs!C4-Calculation!B2` | `0.00" pp"` |
| 4 | Maximum debt at threshold | `=Inputs!C3*(Inputs!C4/100)` | `#,##0.00` |
| 5 | Debt capacity headroom | `=B4-Inputs!C2` | `#,##0.00` |
| 6 | Minimum valuation at threshold | `=Inputs!C2/(Inputs!C4/100)` | `#,##0.00` |

(Row numbers for `Inputs!C2..C4` assume the row order debt/valuation/threshold
fixed above; the writer computes exact addresses programmatically rather than
hardcoding — the table shows the formula shape, not literal final addresses.)

Footer: "These are live Excel formulas recomputing the engine's arithmetic in
IEEE-754 binary floating point. They are a cross-check, not the authoritative
value — see the Parity sheet."

### Sheet 4 — Parity

| Col | Header | Content |
|---|---|---|
| A | Metric | `ltv_percent`, `headroom_percentage_points`, `maximum_debt_at_threshold`, `debt_capacity_headroom`, `minimum_valuation_at_threshold` |
| B | Engine canonical value (authoritative) | text, `outputs.<metric>` full-precision decimal string, format `@` |
| C | Excel recomputed value | formula reference to the matching Calculation-sheet cell, numeric |
| D | Delta | `=VALUE(B{row})-C{row}` (numeric; `VALUE()` is used only for this comparison, never to overwrite B) |
| E | Classification | `=IF(D{row}=0,"Exact match","Floating-point / precision artifact")` |

Row 1 banner (merged, bold): "Engine Decimal values (column B) are
authoritative. Column C is an independent Excel recomputation in binary
floating point, shown as a cross-check only."

Known non-zero case: `minimum_valuation_at_threshold` for the synthetic
baseline is `71000000 / 0.7`, a repeating decimal
(`101428571.42857142857142857142857142857142857142857…`). The engine's
50-digit `Decimal` context truncates it; IEEE-754 double truncates it
differently. This row's delta is expected to be non-zero even for the
synthetic baseline and must be labelled "Floating-point / precision
artifact", not treated as a defect. See §7 for how the acceptance criterion
("delta is zero for the synthetic baseline") is scoped around this.

### Sheet 5 — Threshold resolution

| Row | A | B |
|---|---|---|
| 2 | Test Date | `test_date` |
| 3 | Evaluation date | `evaluation_date` |
| 4 | Amendment active | `selected_threshold.amendment_active` |
| 5 | Controlling document | `threshold_citation.document_title`, `locator`, page |
| 6 | Controlling passage (exact quote) | `threshold_citation.supporting_passage` |
| 8 | Waiver relevant | `waiver_observation is not null` |
| 9 | Waiver test date | `waiver_observation.test_date` (blank if none) |
| 10 | Waiver numeric range (not a threshold) | `"{relief_above_percent}% – {relief_up_to_percent}%"`, shaded, label repeats "not a threshold" |
| 11 | Waiver passage (exact quote) | `waiver_citation.supporting_passage` (blank if none) |
| 12 | Does not amend threshold | `waiver_observation.does_not_amend_threshold` |

The sheet does not synthesize a structured amendment timeline (original
term / step-down dates as separate computed fields) because the calculation
payload does not carry that structure — only the citation text does. Row 6's
exact quoted passage is the sourced record of the amendment period and any
step-down date language; showing it verbatim, rather than re-deriving a
timeline, keeps the sheet citation-only per `AGENTS.md` rule 6 (missing
support must abstain, not be inferred). This is a scope note for the
implementer, not an open question — it is the only design consistent with
the repository's no-fabrication rule given the current payload shape.

### Sheet 6 — Scenario (conditional)

Included only when `calculation["scenario"]["scenario_id"] != "baseline"`.

| Row | A | B |
|---|---|---|
| 2 | Scenario label | `scenario.label` |
| 3 | Rationale | `scenario.rationale` |
| 4 | Assumptions (as stated, not source facts) | one row per `assumptions[i]`, each prefixed "Assumption:" |
| 6 | Debt used in this scenario | `calculation_inputs.debt_amount` (text, `@`) |
| 7 | Valuation used in this scenario | `calculation_inputs.valuation_amount` (text, `@`) |
| 9 | (banner) | "Scenario values are hypothetical assumptions layered on the sourced inputs shown on the Inputs sheet. They are never presented as source facts." |

## 3. Determinism strategy

`generate_verification_workbook()` accepts `generated_at:
datetime.datetime | None = None`. When `None`, it defaults to
`datetime.now(timezone.utc)`; tests always pass an explicit fixed value
(e.g. `datetime(2026, 7, 5, 12, 0, 0, tzinfo=timezone.utc)`) — this is the
"documented deterministic mode for testing" the decision record allows as an
alternative to true byte-identical wall-clock output.

Two concrete sources of non-determinism in a fresh `openpyxl.Workbook()` are
controlled explicitly:

1. `workbook.properties.created` and `workbook.properties.modified`
   (`xl/docProps/core.xml`) default to `datetime.now()` at construction/save
   time. Both are set explicitly to `generated_at`.
2. The visible Summary-sheet provenance row writes `generated_at.isoformat()`
   as literal text — the only cell whose value depends on wall-clock time
   when `generated_at` is omitted.

No macro, VBA, external link, or randomly-seeded identifier is introduced
anywhere in the workbook (Not-authorized list, §9), so no other library
behavior is expected to vary run-to-run for a fixed `generated_at` and fixed
input payload. If the byte-identical test (§7) finds another varying byte
range (for example zip member ordering or an openpyxl-internal `AppVersion`
string tied to the installed openpyxl version rather than the input), the
implementer must pin that value too before relying on the byte-identical
assertion; this PDR does not assume openpyxl's zip writer is already
byte-stable across environments, only across two calls in the same process
with the same inputs, which is what the test actually needs.

**SHA-256 provenance digest.** Computed as
`hashlib.sha256(workbook_bytes).hexdigest()` over the final produced file,
*after* generation completes. It is never written inside the file it
describes — a workbook cannot correctly self-report the hash of its own
final bytes without a second pass, and a second pass would either change the
digest (if it altered any byte) or require reserving a placeholder region,
which is unnecessary complexity for a synthetic reviewer artifact. The digest
is:

- returned in the engine API's `provenance` response field (§5), and
- optionally recorded by the web layer as an audit event (§6) — not inside
  the `.xlsx` bytes and not as a new persisted blob.

The Summary sheet's provenance row (item 20, §2) shows engine version, model
identifiers, and timestamp — the digest is deliberately absent from that row
for the reason above.

## 4. Engine design

New module: `src/agreement_intelligence/excel_pack.py`.

```python
class WorkbookGenerationAbstained(ValueError):
    """Raised when the calculation payload is not a calculated result."""
    def __init__(self, reason: str, missing_information: list[str]):
        super().__init__(reason)
        self.reason = reason
        self.missing_information = missing_information


def generate_verification_workbook(
    calculation: dict[str, Any],
    *,
    generated_at: datetime.datetime | None = None,
    engine_version: str = "1.2.0",
) -> tuple[bytes, dict[str, Any]]:
    """Build the six-sheet .xlsx verification pack for one calculated LTV
    result.

    Args:
        calculation: the exact dict shape produced by
            AgreementIntelligenceEngine.calculate_ltv() — either the
            "calculated_human_review_required" branch (generates a workbook)
            or the "calculation_unavailable" branch (raises
            WorkbookGenerationAbstained; fails closed, no workbook, no
            partial bytes).
        generated_at: fixed timestamp for deterministic generation (tests);
            defaults to current UTC time.
        engine_version: recorded in the Summary sheet and returned
            provenance; the caller (api.py) passes CONTRACT_VERSION.

    Returns:
        (workbook_bytes, provenance) where provenance is
        {"engine_version": str, "model_id": str, "model_version": int,
         "scenario_id": str, "generated_at": str (ISO-8601 UTC),
         "sha256": str}.

    Raises:
        WorkbookGenerationAbstained: calculation["status"] !=
            "calculated_human_review_required", or the citation-role
            matching in §2 cannot resolve uniquely.
        ValueError: calculation fails basic shape checks (missing required
            keys) — treated as a caller bug, not an abstention, since a
            schema-valid payload from calculate_ltv() cannot be malformed
            this way.
    """
```

Internal structure (private helpers, not part of the public surface):
`_write_summary(wb, calculation, generated_at, engine_version)`,
`_write_inputs(wb, calculation, roles)`, `_write_calculation(wb)`,
`_write_parity(wb)`, `_write_threshold_resolution(wb, calculation, roles)`,
`_write_scenario(wb, calculation)` (called only when scenario is non-baseline),
`_resolve_citation_roles(calculation) -> CitationRoles` (the §2 matching
logic, raising `WorkbookGenerationAbstained` on ambiguity),
`_status_label(status: str) -> str`, `_review_footer(ws, row)`.

`excel_pack.py` does **not** import `AgreementIntelligenceEngine`,
`DocumentRegistry`, or `PassageStore`. It is a pure formatting function of its
input dict plus a clock. Re-verifying that citations in the payload actually
match the corpus (defense in depth against a tampered or stale payload) is
the caller's responsibility (api.py, §5) — this keeps the module unit-testable
without a workspace fixture and keeps the "citation mismatch" adversarial
case a caller-boundary concern, not an excel_pack concern.

**Dependency addition** (`pyproject.toml`):

```toml
dependencies = ["pypdf>=5.0", "openpyxl>=3.1"]
```

No other dependency is introduced. `openpyxl` is used with default settings;
`keep_vba` is never enabled (write path), so no `vbaProject.bin` can be
produced.

## 5. API design

New path, same handler module (`api.py`), same JSON-only contract style as
every existing endpoint:

```
POST /v1/workspaces/{workspaceId}/models/ltv-calculations/verification-workbook
```

**Request body**: the `CalculatedLtv` object exactly — i.e., re-submit the
same JSON that `POST .../ltv-calculations` returned and that the web layer
persisted as `financial_model_runs.result_json`. The engine does not accept
`{model_id, scenario_id}` and recompute internally, for one reason: the
workbook must reflect precisely the value a reviewer already saw and that
was persisted and audited (`saveFinancialModelRun` already re-verifies this
payload against passages before writing `financial_model_runs` — see
`apps/web/src/lib/persistence/sqlite.ts:843-902`). Recomputing live would let
the workbook silently diverge from the persisted run if the manifest ever
changed between the run and the download (not possible for the immutable
synthetic corpus today, but the contract should not depend on that being
permanently true). This mirrors the existing `AnswerRequest`/`Answer`
round-trip pattern already present in the contract (the caller supplies the
identifying context; the engine does not re-run open-ended retrieval).

Before generating, the handler re-verifies every citation in the submitted
payload against the live corpus using the same technique
`AgreementIntelligenceEngine._citation()` already uses (passage lookup by
`document_id`/`locator`, `supporting_passage in passage.text`, `page` match)
for `sources`, `source_inputs.debt_amount`, and
`source_inputs.valuation_amount`. Any mismatch is a 400 with a citation-
mismatch reason — this is the "citation mismatch detection" adversarial case
from §7, and it lives here (not in `excel_pack.py`) because only the API
layer has registry/corpus access.

**Response body** (200):

```json
{
  "workbook_base64": "<base64-encoded .xlsx bytes>",
  "provenance": {
    "engine_version": "1.2.0",
    "model_id": "ltv-v1",
    "model_version": 1,
    "scenario_id": "baseline",
    "generated_at": "2026-07-05T12:00:00+00:00",
    "sha256": "<hex digest>"
  }
}
```

**Base64-in-JSON, not raw bytes** — chosen over an
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` binary
response because every existing response in this contract (`Answer`,
`ContractPosition`, `LtvCalculation`, `Health`, `Problem`) is
`application/json`, and `make_engine_api_handler`'s `_send_json` helper is
the only response-writing path currently implemented in `api.py`. Adding a
second binary content-type path to a ~200-line stdlib `http.server` handler
for a workbook that is a few kilobytes is not justified by the size; base64's
~33% overhead is immaterial at this scale, and keeping one response
serialization path keeps the zod validation on the web side (`engine-
contract.ts`) uniform with every other endpoint.

**Error cases**:

| Status | Cause |
|---|---|
| 400 | Payload fails shape validation against `CalculatedLtv` schema |
| 400 | `status` is not `calculated_human_review_required` (abstention passthrough — echoes `missing_information`) |
| 400 | A citation or source input does not match the live corpus (citation-mismatch) |
| 404 | Workspace not found |
| 415 | `Content-Type` is not `application/json` |
| 400 | Request body exceeds `MAX_REQUEST_BYTES` (existing constant, reused) |

`contracts/engine-api.openapi.yaml` gains the new path plus
`VerificationWorkbookRequest: { $ref: '#/components/schemas/CalculatedLtv' }`
and a `VerificationWorkbookResponse` schema matching the JSON shape above.
`CONTRACT_VERSION` (`api.py`) and `ENGINE_CONTRACT_VERSION`
(`engine-contract.ts`) and the OpenAPI `info.version` move to `1.3.0`
together (additive, non-breaking — same convention already used when the
`ltv-calculations` endpoint was added under `1.2.0`).

## 6. Web design

New client-visible action on `/models`, following the existing
form/action/button triplet (`ModelRunForm` / `runFinancialModel` /
`ModelRunButton`) rather than a Next.js Route Handler — the codebase has no
`route.ts` precedent (checked: none exists under `apps/web/src/app`), and the
server-action pattern already handles the loading/error states this feature
needs.

- `apps/web/src/lib/engine-contract.ts`: add
  `verificationWorkbookResponseSchema` (base64 string + provenance object
  matching §5) and `requestEngineVerificationWorkbook(workspaceId,
  calculation: CalculatedEngineLtv): Promise<VerificationWorkbookResponse>`,
  mirroring `requestEngineLtvCalculation`'s fetch/validate/error-wrap shape.
- `apps/web/src/app/(product)/models/actions.ts`: add
  `downloadVerificationPack(scenarioId: string)` server action returning
  `{ error: string | null; workbookBase64: string | null; filename: string
  | null }`. It loads the active model via `getPersistence
  ().getActiveFinancialModel(...)`, finds the matching persisted run in
  `model.latestRuns` for `scenarioId`, calls
  `requestEngineVerificationWorkbook("demo", run.result)`, and on success
  calls a new persistence method (below) to record provenance, then returns
  the base64 payload and a filename
  (`ltv-v1-v${version}-${scenarioId}-verification-pack.xlsx`).
- `apps/web/src/components/verification-pack-download-button.tsx` (new,
  mirrors `model-run-button.tsx`: `useFormStatus`, spinner while pending,
  label "Download verification pack" / "Preparing…").
- `apps/web/src/components/verification-pack-download-form.tsx` (new,
  mirrors `model-run-form.tsx`: `useActionState`, renders the button, shows
  `state.error` as `role="alert"`; on a successful `state.workbookBase64`,
  a `useEffect` decodes it (`atob` + `Uint8Array`), builds a `Blob` with
  type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  and triggers the download via a temporary `<a download>` + `URL
  .createObjectURL`, then revokes the object URL. No server-rendered link to
  a file path is ever produced — the file only exists in the browser's
  memory for the duration of the download.
- `apps/web/src/app/(product)/models/page.tsx`: render
  `<VerificationPackDownloadForm scenarioId="baseline" />` next to the
  existing `<ModelRunForm hasRun />` in the header, only when `baseline` is
  defined (mirrors the page's existing `if (!baseline)` gate).

**Engine-off behavior**: identical in shape to `runFinancialModel`'s existing
catch-all — `downloadVerificationPack` catches fetch/validation failures and
returns `{ error: "The calculation engine is unavailable. Start the local
engine and retry.", workbookBase64: null, filename: null }`. No workbook, no
partial file, no persisted state on failure — same fail-closed shape the page
already uses for calculation failures.

**What is persisted — decision: record the digest, not the file.** Add one
`Persistence` method:

```ts
recordVerificationPackProvenance(input: {
  actor: ActorContext;
  workspaceId: string;
  modelVersionId: string;
  runId: string;
  scenarioId: string;
  sha256: string;
  engineVersion: string;
  generatedAt: string;
}): void;
```

Implemented in `sqlite.ts` as a single `INSERT INTO audit_events` row with
`action = 'financial_model.verification_pack_generated'` and `detail_json`
containing the fields above — the same table and pattern
`saveFinancialModelRun` already uses for `financial_model.calculated`
(`sqlite.ts:929-940`). **No new table and no migration.** Justification:

- The decision record authorizes generating and recording provenance, not
  storing the workbook — persisting the bytes (or a storage-key pointer to
  them) would need object storage, which is explicitly not authorized
  (§9, "Not authorized").
- `audit_events` already exists, already carries a free-form `detail_json`,
  and is already the mechanism for "something happened to this model
  version" facts. A new `financial_model_verification_packs` table would
  duplicate that role for no additional guarantee — nothing needs to look up
  "the pack for run X" later; the digest is provenance evidence for a
  point-in-time download, not a retrievable artifact.
- Not persisting the digest at all was considered and rejected: the decision
  explicitly lists the digest as part of "workbook provenance" that must be
  "recorded," and an audit trail of exactly which bytes were handed to a
  reviewer (and when) is the cheapest way to satisfy that without expanding
  scope.

If `recordVerificationPackProvenance` throws (e.g. workspace access check
fails), `downloadVerificationPack` still returns the already-generated
`workbookBase64` to the browser — an audit-log failure must not block a
reviewer's download of a value they already had a right to see, since the
engine itself is the source of truth, not the audit row. This mirrors the
existing principle that engine values are authoritative.

## 7. Test plan

One-to-one against the decision record's Acceptance section, all in
`tests/test_excel_pack.py` (Python `unittest`) unless noted:

| Acceptance criterion | Test |
|---|---|
| Byte-identical generation (or documented deterministic mode) | `test_same_fixed_timestamp_is_byte_identical`: generate twice with identical `calculation` and identical `generated_at`; assert `hashlib.sha256` of both byte strings match. `test_varying_timestamp_only_changes_timestamp_cell`: generate with two different `generated_at` values, load both with `openpyxl.load_workbook`, assert every cell value is equal except the Summary provenance row. |
| Parity delta zero for synthetic baseline | `test_parity_delta_zero_for_baseline_metrics`: for `ltv_percent`, `headroom_percentage_points`, `maximum_debt_at_threshold`, `debt_capacity_headroom` assert the Parity sheet's delta cell evaluates to `0` (using `openpyxl` with `data_only=False`, recomputing the formula independently in the test with Python floats, since `openpyxl` does not evaluate formulas on load). `test_parity_minimum_valuation_is_labelled_artifact`: assert `minimum_valuation_at_threshold`'s delta is non-zero and its classification cell reads "Floating-point / precision artifact" — this is the documented exception from §2, not a regression. |
| No macros, no external references | `test_workbook_has_no_macro_or_external_link_parts`: open the produced bytes as a zip (`zipfile.ZipFile(io.BytesIO(...))`), assert `"xl/vbaProject.bin"` and any `"xl/externalLinks/"` member are absent; assert `openpyxl.load_workbook(..., keep_vba=False)` round-trips without a `vba_archive`. |
| Citations match persisted payload exactly | `test_inputs_sheet_citations_match_payload`: for each of debt/valuation/threshold/definition, assert the Inputs-sheet row's document title, locator, page, passage ID, and exact quote equal the corresponding fields in the input `calculation` dict verbatim. |
| 72.0% waiver ceiling never in a threshold-labelled cell | `test_waiver_ceiling_never_in_threshold_cell`: scan every worksheet for any true threshold-labelled cell, excluding the intentional waiver observation row/section (`relief_up_to_percent == "72"`); assert no threshold cell holds `"72"` or a string containing `"72.00%"`. Run against the real baseline payload, not a synthetic fixture, so the test fails if a future edit ever mislabels the waiver ceiling as the selected threshold. |
| Abstaining model versions refuse generation with a typed reason | `test_calculation_unavailable_payload_raises_typed_abstention`: pass an `UnavailableLtv`-shaped dict (`status: "calculation_unavailable"`), assert `WorkbookGenerationAbstained` is raised and `.missing_information` matches the input's `missing_information`. |
| Existing checks continue to pass | Not a new test — CI/manual gate: `python -m unittest discover`, the web test suite (`node --test` per `apps/web/tests/*.test.ts`), and the existing benchmark/citation checks referenced by `AGENTS.md`, run unmodified. |

Adversarial cases beyond the decision's own acceptance list, in
`tests/test_engine_api.py` (Python, since they require the HTTP layer and
corpus access that `excel_pack.py` deliberately does not have):

- `test_verification_workbook_endpoint_rejects_abstaining_payload`: POST an
  `UnavailableLtv`-shaped body; assert HTTP 400 with an error message
  containing the abstention reason, and that no workbook bytes are ever
  returned (response has no `workbook_base64` key).
- `test_verification_workbook_endpoint_rejects_tampered_citation`: take a
  real `calculate_ltv()` result, mutate one `sources[i].supporting_passage`
  to text not present in the actual passage; assert HTTP 400 with a
  citation-mismatch message and no workbook generated.
- `test_verification_workbook_endpoint_rejects_waiver_relabelled_as_threshold`:
  take a real result, overwrite `selected_threshold.percent` with the
  waiver's `relief_up_to_percent` (simulating a caller trying to smuggle the
  waiver ceiling in as the threshold); assert this either fails citation
  verification (the mutated threshold no longer matches
  `threshold_citation`'s locator) or, if it somehow passes, that the
  generated workbook's Summary "Selected threshold" cell is provably sourced
  from `threshold_citation` and not from `relief_up_to_percent` — i.e. this
  test pins the citation-role matching in §2 as the actual defense, not a
  string comparison.

Web tests, `apps/web/tests/verification-pack.test.ts` (Node's built-in
`node:test` + `assert/strict`, following `source-transparency.test.ts`'s
`openSeeded()` temp-database helper — no new test framework):

- `recordVerificationPackProvenance` inserts exactly one `audit_events` row
  with the expected `action` and `detail_json` fields, against a seeded demo
  database.
- `verificationWorkbookResponseSchema` accepts a well-formed fixture and
  rejects a payload missing `sha256` or with a malformed base64 string
  (schema-level test, no network).
- `downloadVerificationPack` returns `{error: "...engine is unavailable..."}`
  when the engine fetch throws, and does not call
  `recordVerificationPackProvenance` in that case (mirrors the "engine-off"
  gate `runFinancialModel` already has, per `apps/web/src/app/(product)/
  models/actions.ts:61-67`).

## 8. Implementation task breakdown

Two non-overlapping packages. Package B can be built against this PDR's §5
JSON shapes before Package A lands (stub `requestEngineVerificationWorkbook`
against a local fixture matching §5's response shape; swap to the real fetch
once Package A's endpoint exists — no other change needed since the contract
is fixed by this document).

**Package A — engine + tests (Python). Files it may touch:**

- `src/agreement_intelligence/excel_pack.py` (new)
- `src/agreement_intelligence/api.py` (add route regex + handler branch +
  citation re-verification helper; no change to existing routes)
- `pyproject.toml` (add `openpyxl>=3.1`)
- `contracts/engine-api.openapi.yaml` (new path + schemas; bump
  `info.version` to `1.3.0`)
- `tests/test_excel_pack.py` (new)
- `tests/test_engine_api.py` (add the three adversarial cases in §7; no
  change to existing test bodies)

**Package B — web surface (TypeScript). Files it may touch:**

- `apps/web/src/lib/engine-contract.ts` (add schema + request function; bump
  `ENGINE_CONTRACT_VERSION` to `1.3.0`)
- `apps/web/src/app/(product)/models/actions.ts` (add
  `downloadVerificationPack`; no change to `runFinancialModel`)
- `apps/web/src/components/verification-pack-download-button.tsx` (new)
- `apps/web/src/components/verification-pack-download-form.tsx` (new)
- `apps/web/src/app/(product)/models/page.tsx` (render the new form next to
  the existing `ModelRunForm`)
- `apps/web/src/lib/persistence/types.ts` (add
  `recordVerificationPackProvenance` to the `Persistence` interface and its
  input type)
- `apps/web/src/lib/persistence/sqlite.ts` (implement it as an
  `audit_events` insert; no schema migration)
- `apps/web/tests/verification-pack.test.ts` (new)

Neither package touches a file the other owns. `contracts/engine-
api.openapi.yaml` is Package A's file since it documents the Python-served
contract; Package B treats it as a read-only reference while stubbing.

## 9. Out of scope

Restated from the decision record's Not-authorized list — none of it is
revisited by this PDR:

- Reading, importing, or ingesting any spreadsheet.
- Macro-enabled or externally linked workbooks.
- Live synchronization or bidirectional editing between the workbook and the
  system.
- Real or confidential financial inputs or agreements.
- Cloud storage, e-mail, or any transmission of the workbook by the system —
  the browser download in §6 is client-initiated and the system does not
  retain the file.
- Presenting Excel recomputation as the authoritative value.
- Any compliance, breach, default, or waiver-satisfaction conclusion.

## Open questions for the implementer

1. **Minimum-valuation-at-threshold delta.** §2 and §7 establish that this
   row's parity delta is non-zero even for the synthetic baseline, because
   the value is an inherently repeating decimal. The decision record's
   acceptance line ("delta is zero for the synthetic baseline") is read here
   as applying to the four metrics that are exact for 71,000,000 /
   100,000,000 / 70.0%, with the fifth documented as an expected, correctly
   labelled artifact. If the owner intends the acceptance criterion
   literally (all five rows), the sheet would need a rounding convention for
   this one metric — not designed here, since it would mean displaying a
   rounded value next to "authoritative," which cuts against trust boundary
   4 (full precision on Inputs/Parity).
2. **Workbook filename and repeated downloads.** The filename scheme
   (`ltv-v1-v{version}-{scenarioId}-verification-pack.xlsx`) is not
   specified by the decision record; confirm it, or a different convention,
   before Package B ships.
3. **CONTRACT_VERSION bump to 1.3.0.** This PDR assumes the same
   additive-version convention used when `ltv-calculations` was added under
   1.2.0. If that assumption about repository history is wrong (i.e. the
   version was not bumped for that endpoint), confirm whether a version bump
   is expected here at all.
