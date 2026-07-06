import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import Database from "better-sqlite3";
import {
  verificationWorkbookResponseSchema,
  type CalculatedEngineLtv,
} from "../src/lib/engine-contract";
import { SqlitePersistence } from "../src/lib/persistence/sqlite";
import {
  SYNTHETIC_ORGANIZATION_ID,
  SYNTHETIC_USER_ID,
  SYNTHETIC_WORKSPACE_ID,
} from "../src/lib/persistence/synthetic-seed";

const temporaryDirectories: string[] = [];
const manifestPath = path.resolve(
  process.cwd(),
  "../../workspaces/demo/manifest.json",
);
const actor = {
  userId: SYNTHETIC_USER_ID,
  organizationId: SYNTHETIC_ORGANIZATION_ID,
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "agreement-intelligence-"),
  );
  temporaryDirectories.push(directory);
  return directory;
}

function openSeeded(): {
  persistence: SqlitePersistence;
  databasePath: string;
} {
  const directory = temporaryDirectory();
  const databasePath = path.join(directory, "state.db");
  const persistence = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  return { persistence, databasePath };
}

function baselineCalculation(
  persistence: SqlitePersistence,
): CalculatedEngineLtv {
  const evidenceKeys = [
    ["doc_facility_001", "Clause 1.1"],
    ["doc_amendment_001", "Section 2.1"],
    ["doc_balance_001", "Section 1"],
    ["doc_valuation_001", "Section 1"],
    ["doc_waiver_001", "Section 2.1"],
  ] as const;
  const sources = evidenceKeys.map(([documentId, locator]) => {
    const evidence = persistence.getPassageEvidence(
      actor,
      SYNTHETIC_WORKSPACE_ID,
      documentId,
      locator,
    );
    return {
      document_id: evidence.documentId,
      document_title: evidence.documentTitle,
      document_type: evidence.documentType,
      locator: evidence.locator,
      page: evidence.page,
      passage_id: evidence.passageId,
      supporting_passage: evidence.text,
      source_path: evidence.sourcePath,
    };
  });
  return {
    model_id: "ltv-v1",
    model_version: 1,
    status: "calculated_human_review_required",
    calculation_purpose: "covenant_test",
    evaluation_date: "2026-07-02",
    test_date: "2026-06-30",
    currency: "EUR",
    scenario: {
      scenario_id: "baseline",
      label: "Reported baseline",
      rationale: "Uses only the two persisted source inputs.",
    },
    source_inputs: {
      debt_amount: {
        value: "71000000",
        effective_date: "2026-06-30",
        document_id: "doc_balance_001",
        locator: "Section 1",
      },
      valuation_amount: {
        value: "100000000",
        effective_date: "2026-06-30",
        document_id: "doc_valuation_001",
        locator: "Section 1",
      },
    },
    calculation_inputs: {
      debt_amount: "71000000",
      valuation_amount: "100000000",
    },
    formula: {
      expression: "debt_amount / valuation_amount * 100",
      comparison_policy: "full_precision",
      display_rounding: "ROUND_HALF_EVEN_2DP",
      trace: "71000000 / 100000000 * 100 = 71%",
    },
    outputs: {
      debt_amount: "71000000",
      valuation_amount: "100000000",
      threshold_percent: "70",
      ltv_percent: "71",
      ltv_display: "71.00%",
      headroom_percentage_points: "-1",
      headroom_display: "-1 pp",
      maximum_debt_at_threshold: "70000000",
      debt_capacity_headroom: "-1000000",
      minimum_valuation_at_threshold:
        "101428571.42857142857142857142857142857142857142857",
      arithmetic_status: "above_selected_threshold",
    },
    selected_threshold: {
      percent: "70",
      document_id: "doc_amendment_001",
      locator: "Section 2.1",
      amendment_active: true,
    },
    waiver_observation: {
      relevant: true,
      test_date: "2026-06-30",
      relief_above_percent: "70.0",
      relief_up_to_percent: "72.0",
      within_stated_numeric_range: true,
      does_not_amend_threshold: true,
    },
    assumptions: [],
    missing_information: [],
    human_review_required: true,
    review_note: "Calculation only; human review required.",
    sources,
  };
}

const validProvenance = {
  engine_version: "1.3.0",
  model_id: "ltv-v1",
  model_version: 1,
  scenario_id: "baseline",
  generated_at: "2026-07-05T12:00:00+00:00",
  sha256: "a".repeat(64),
};

test("verification workbook response schema accepts a valid payload", () => {
  const parsed = verificationWorkbookResponseSchema.parse({
    workbook_base64: "UEsDBA==",
    provenance: validProvenance,
  });
  assert.equal(parsed.provenance.scenario_id, "baseline");
});

test("verification workbook response schema rejects malformed payloads", () => {
  assert.throws(() =>
    verificationWorkbookResponseSchema.parse({
      workbook_base64: "not base64!!!",
      provenance: validProvenance,
    }),
  );
  assert.throws(() =>
    verificationWorkbookResponseSchema.parse({
      workbook_base64: "UEsDBA==",
      provenance: { ...validProvenance, sha256: undefined },
    }),
  );
});

test("provenance is recorded as one audit event against the run", () => {
  const { persistence, databasePath } = openSeeded();
  const saved = persistence.saveFinancialModelRun({
    actor,
    workspaceId: SYNTHETIC_WORKSPACE_ID,
    calculation: baselineCalculation(persistence),
  });
  persistence.recordVerificationPackProvenance({
    actor,
    workspaceId: SYNTHETIC_WORKSPACE_ID,
    runId: saved.id,
    scenarioId: "baseline",
    sha256: validProvenance.sha256,
    engineVersion: validProvenance.engine_version,
    generatedAt: validProvenance.generated_at,
  });
  persistence.close();

  const inspector = new Database(databasePath);
  const rows = inspector
    .prepare(
      `SELECT entity_id, detail_json FROM audit_events
       WHERE action = 'financial_model.verification_pack_generated'`,
    )
    .all() as Array<{ entity_id: string; detail_json: string }>;
  inspector.close();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].entity_id, saved.id);
  const detail = JSON.parse(rows[0].detail_json) as Record<string, string>;
  assert.equal(detail.sha256, validProvenance.sha256);
  assert.equal(detail.engineVersion, "1.3.0");
  assert.equal(detail.scenarioId, "baseline");
});

test("provenance without a persisted run fails closed", () => {
  const { persistence, databasePath } = openSeeded();
  assert.throws(
    () =>
      persistence.recordVerificationPackProvenance({
        actor,
        workspaceId: SYNTHETIC_WORKSPACE_ID,
        runId: "missing-run",
        scenarioId: "baseline",
        sha256: validProvenance.sha256,
        engineVersion: validProvenance.engine_version,
        generatedAt: validProvenance.generated_at,
      }),
    /persisted model run/,
  );
  persistence.close();

  const inspector = new Database(databasePath);
  const count = inspector
    .prepare(
      `SELECT COUNT(*) AS total FROM audit_events
       WHERE action = 'financial_model.verification_pack_generated'`,
    )
    .get() as { total: number };
  inspector.close();
  assert.equal(count.total, 0);
});
