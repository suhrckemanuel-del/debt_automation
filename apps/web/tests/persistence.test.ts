import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import Database from "better-sqlite3";
import type {
  CalculatedEngineLtv,
  EngineAnswer,
} from "../src/lib/engine-contract";
import { loadPersistenceConfig } from "../src/lib/persistence/config";
import { SqlitePersistence } from "../src/lib/persistence/sqlite";
import { SQLITE_SCHEMA } from "../src/lib/persistence/sqlite-schema";
import {
  seedSyntheticDemo,
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

function temporaryDatabasePath(): string {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "agreement-intelligence-"),
  );
  temporaryDirectories.push(directory);
  return path.join(directory, "state.db");
}

test("the backend must be selected explicitly", () => {
  const previous = { ...process.env };
  delete process.env.AGREEMENT_DATA_BACKEND;
  delete process.env.AGREEMENT_SQLITE_PATH;
  assert.throws(
    () => loadPersistenceConfig(),
    /AGREEMENT_DATA_BACKEND is required/,
  );
  process.env = previous;
});

test("workspace state survives closing and reopening the backend", () => {
  const databasePath = temporaryDatabasePath();
  const first = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  const renamed = "Synthetic Facility A · persisted";
  first.updateWorkspaceName(actor, SYNTHETIC_WORKSPACE_ID, renamed);
  assert.equal(
    first.getDashboardSnapshot(actor, SYNTHETIC_WORKSPACE_ID).workspace.name,
    renamed,
  );
  first.close();

  const reopened = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  const snapshot = reopened.getDashboardSnapshot(
    actor,
    SYNTHETIC_WORKSPACE_ID,
  );
  assert.equal(snapshot.workspace.name, renamed);
  assert.equal(snapshot.documents.length, 5);
  assert.equal(snapshot.workspace.passageCount, 15);
  assert.equal(snapshot.recentEvents[0]?.action, "workspace.renamed");
  reopened.close();

  const inspector = new Database(databasePath, { readonly: true });
  const citedPassage = inspector
    .prepare(
      `SELECT p.page_number, p.passage_text
       FROM passages p JOIN documents d ON d.id = p.document_id
       WHERE d.external_id = 'doc_facility_001'
         AND p.locator = 'Clause 10.2'`,
    )
    .get() as { page_number: number; passage_text: string };
  assert.equal(citedPassage.page_number, 14);
  assert.match(citedPassage.passage_text, /does not exceed 65\.0%/);
  inspector.close();
});

test("decision evidence is loaded through workspace-authorized persistence", () => {
  const databasePath = temporaryDatabasePath();
  const persistence = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });

  const evidence = persistence.getPassageEvidence(
    actor,
    SYNTHETIC_WORKSPACE_ID,
    "doc_facility_001",
    "Clause 10.2",
  );
  assert.equal(evidence.documentId, "doc_facility_001");
  assert.equal(evidence.page, 14);
  assert.match(evidence.text, /does not exceed 65\.0%/);
  assert.throws(
    () =>
      persistence.getPassageEvidence(
        { ...actor, userId: "unauthorized-user" },
        SYNTHETIC_WORKSPACE_ID,
        "doc_facility_001",
        "Clause 10.2",
      ),
    /access denied/,
  );
  persistence.close();
});

test("financial model inputs and immutable runs survive backend restart", () => {
  const databasePath = temporaryDatabasePath();
  const persistence = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  const model = persistence.getActiveFinancialModel(
    actor,
    SYNTHETIC_WORKSPACE_ID,
    "ltv-v1",
  );
  assert.ok(model);
  assert.equal(model.inputs.length, 2);
  assert.equal(model.scenarios.length, 3);

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
  const calculation: CalculatedEngineLtv = {
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
  const saved = persistence.saveFinancialModelRun({
    actor,
    workspaceId: SYNTHETIC_WORKSPACE_ID,
    calculation,
  });
  persistence.close();

  const reopened = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  const restored = reopened.getActiveFinancialModel(
    actor,
    SYNTHETIC_WORKSPACE_ID,
    "ltv-v1",
  );
  assert.equal(restored?.latestRuns[0]?.id, saved.id);
  assert.equal(restored?.latestRuns[0]?.result.outputs.ltv_percent, "71");
  reopened.close();

  const inspector = new Database(databasePath);
  assert.throws(
    () =>
      inspector
        .prepare("UPDATE financial_model_runs SET scenario_id = 'tampered'")
        .run(),
    /immutable/,
  );
  inspector.close();
});

test("mapping activation is atomic and appends an immutable manifest", () => {
  const databasePath = temporaryDatabasePath();
  const database = new Database(databasePath);
  database.exec(SQLITE_SCHEMA);
  seedSyntheticDemo(database, manifestPath);
  const persistence = new SqlitePersistence(database, databasePath);
  const draftId = randomUUID();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO mapping_drafts
        (id, workspace_id, created_by, status, expected_slot_count,
         last_validation_errors, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', 1, '[]', ?, ?)`,
    )
    .run(draftId, SYNTHETIC_WORKSPACE_ID, SYNTHETIC_USER_ID, now, now);

  assert.throws(
    () =>
      persistence.activateMappingDraft({
        actor,
        workspaceId: SYNTHETIC_WORKSPACE_ID,
        draftId,
        snapshot: { version: "invalid" },
      }),
    /every slot to be reviewed/,
  );
  const before = database
    .prepare(
      `SELECT active_manifest_version FROM workspaces WHERE id = ?`,
    )
    .get(SYNTHETIC_WORKSPACE_ID) as { active_manifest_version: number };
  assert.equal(before.active_manifest_version, 1);

  const source = database
    .prepare(
      `SELECT d.id AS document_id, p.id AS passage_id, p.locator,
              p.passage_text
       FROM passages p JOIN documents d ON d.id = p.document_id
       WHERE p.workspace_id = ? LIMIT 1`,
    )
    .get(SYNTHETIC_WORKSPACE_ID) as {
    document_id: string;
    passage_id: string;
    locator: string;
    passage_text: string;
  };
  database
    .prepare(
      `INSERT INTO mapping_draft_slots
        (id, draft_id, slot_key, document_id, passage_id, locator,
         exact_quote, reviewed_by, reviewed_at)
       VALUES (?, ?, 'ltv.base', ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      draftId,
      source.document_id,
      source.passage_id,
      source.locator,
      source.passage_text,
      SYNTHETIC_USER_ID,
      now,
    );

  const version = persistence.activateMappingDraft({
    actor,
    workspaceId: SYNTHETIC_WORKSPACE_ID,
    draftId,
    snapshot: { synthetic: true, provisions: ["ltv.base"] },
  });
  assert.equal(version, 2);
  assert.throws(
    () =>
      database
        .prepare(
          `UPDATE manifest_versions SET snapshot_json = '{}'
           WHERE workspace_id = ? AND version = 2`,
        )
        .run(SYNTHETIC_WORKSPACE_ID),
    /immutable/,
  );
  persistence.close();
});

test("source-backed answers and exact citations survive backend restart", () => {
  const databasePath = temporaryDatabasePath();
  const persistence = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  const answer: EngineAnswer = {
    question: "What is the current maximum LTV?",
    as_of_date: "2026-07-02",
    short_answer: "The current contractual threshold is 70.0%.",
    support_status: "supported",
    sources: [
      {
        document_id: "doc_facility_001",
        document_title: "Synthetic Facility Agreement — Facility A",
        document_type: "facility_agreement",
        locator: "Clause 10.2",
        page: 14,
        passage_id: "doc_facility_001:clause-10-2",
        supporting_passage:
          "The Borrower shall ensure that the Loan-to-Value Ratio does not exceed 65.0% on any Test Date.",
        source_path: "docs/phase-1/synthetic-corpus/facility_agreement.md",
      },
    ],
    assumptions: [],
    missing_information: ["Applicable debt amount"],
    human_review_required: false,
    review_note: "Extraction only.",
    notes_on_currentness: "The amendment controls on the supplied date.",
    query_category: "current_ltv",
  };
  const saved = persistence.saveAnswer({
    actor,
    workspaceId: SYNTHETIC_WORKSPACE_ID,
    answer,
  });
  assert.equal(saved.sources.length, 1);
  assert.equal(saved.sources[0]?.page, 14);
  assert.equal(saved.manifestVersion, 1);
  persistence.close();

  const reopened = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  const restored = reopened.getAnswer(
    actor,
    SYNTHETIC_WORKSPACE_ID,
    saved.id,
  );
  assert.equal(restored?.short_answer, answer.short_answer);
  assert.equal(restored?.sources[0]?.supporting_passage, answer.sources[0]?.supporting_passage);
  assert.equal(
    reopened.getDashboardSnapshot(actor, SYNTHETIC_WORKSPACE_ID).answerCount,
    1,
  );
  reopened.close();
});

test("citation mismatch aborts answer persistence without partial rows", () => {
  const databasePath = temporaryDatabasePath();
  const persistence = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  const invalidAnswer: EngineAnswer = {
    question: "What is the current maximum LTV?",
    as_of_date: "2026-07-02",
    short_answer: "Unsupported mutation.",
    support_status: "supported",
    sources: [
      {
        document_id: "doc_facility_001",
        document_title: "Synthetic Facility Agreement — Facility A",
        document_type: "facility_agreement",
        locator: "Clause 10.2",
        page: 14,
        passage_id: "doc_facility_001:clause-10-2",
        supporting_passage: "This passage does not exist.",
        source_path: "docs/phase-1/synthetic-corpus/facility_agreement.md",
      },
    ],
    assumptions: [],
    missing_information: [],
    human_review_required: false,
    review_note: "",
    notes_on_currentness: "",
    query_category: "current_ltv",
  };
  assert.throws(
    () =>
      persistence.saveAnswer({
        actor,
        workspaceId: SYNTHETIC_WORKSPACE_ID,
        answer: invalidAnswer,
      }),
    /not an exact persisted source excerpt/,
  );
  const snapshot = persistence.getDashboardSnapshot(
    actor,
    SYNTHETIC_WORKSPACE_ID,
  );
  assert.equal(snapshot.answerCount, 0);
  assert.equal(snapshot.citationCount, 0);
  persistence.close();
});
