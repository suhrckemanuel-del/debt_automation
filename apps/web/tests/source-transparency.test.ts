import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import Database from "better-sqlite3";
import {
  documentDetailPath,
  isValidExternalDocumentId,
  passageAnchorId,
  passageHref,
} from "../src/lib/evidence-links";
import {
  assertSafeDemoReset,
  resetSyntheticDemoState,
} from "../src/lib/persistence/demo-reset";
import { SqlitePersistence } from "../src/lib/persistence/sqlite";
import { SQLITE_SCHEMA } from "../src/lib/persistence/sqlite-schema";
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

function openSeeded(): { persistence: SqlitePersistence; directory: string } {
  const directory = temporaryDirectory();
  const persistence = SqlitePersistence.open(path.join(directory, "state.db"), {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  return { persistence, directory };
}

test("evidence links are stable and validated", () => {
  assert.equal(
    passageAnchorId("doc_waiver_001", "Section 3"),
    "doc_waiver_001:section-3",
  );
  assert.equal(
    passageAnchorId("doc_facility_001", "Clause 10.2"),
    "doc_facility_001:clause-10-2",
  );
  assert.equal(documentDetailPath("doc_waiver_001"), "/documents/doc_waiver_001");
  assert.equal(
    passageHref("doc_waiver_001", "Section 3"),
    "/documents/doc_waiver_001#doc_waiver_001:section-3",
  );
  assert.equal(isValidExternalDocumentId("doc_waiver_001"), true);
  assert.equal(isValidExternalDocumentId("../escape"), false);
  assert.equal(isValidExternalDocumentId(""), false);
});

test("document detail exposes persisted passages and manifest relationships", () => {
  const { persistence } = openSeeded();
  const waiver = persistence.getDocumentDetail(
    actor,
    SYNTHETIC_WORKSPACE_ID,
    "doc_waiver_001",
  );
  assert.ok(waiver);
  assert.equal(waiver.title, "Synthetic Waiver Letter — Facility A");
  assert.equal(waiver.storageKey, null);
  assert.ok(waiver.sourcePath.startsWith("docs/phase-1/synthetic-corpus/"));
  assert.ok(waiver.passages.length >= 3);
  const section3 = waiver.passages.find(
    (passage) => passage.locator === "Section 3",
  );
  assert.ok(section3);
  assert.match(section3.text, /no Distribution from the Effective Date/);
  assert.ok(section3.page > 0);
  assert.deepEqual(
    waiver.relatedDocuments
      .map((reference) => `${reference.relationship}:${reference.externalId}`)
      .sort(),
    ["related:doc_amendment_001", "related:doc_facility_001"],
  );

  const amendment = persistence.getDocumentDetail(
    actor,
    SYNTHETIC_WORKSPACE_ID,
    "doc_amendment_001",
  );
  assert.ok(amendment);
  assert.deepEqual(
    amendment.relatedDocuments.map(
      (reference) => `${reference.relationship}:${reference.externalId}`,
    ),
    ["modifies:doc_facility_001", "related:doc_waiver_001"],
  );

  const facility = persistence.getDocumentDetail(
    actor,
    SYNTHETIC_WORKSPACE_ID,
    "doc_facility_001",
  );
  assert.ok(facility);
  const facilityRelationships = facility.relatedDocuments.map(
    (reference) => `${reference.relationship}:${reference.externalId}`,
  );
  assert.ok(facilityRelationships.includes("modified_by:doc_amendment_001"));
  assert.ok(facilityRelationships.includes("related:doc_waiver_001"));
  persistence.close();
});

test("document detail fails safely for unknown ids and foreign actors", () => {
  const { persistence } = openSeeded();
  assert.equal(
    persistence.getDocumentDetail(
      actor,
      SYNTHETIC_WORKSPACE_ID,
      "doc_missing_999",
    ),
    null,
  );
  assert.throws(
    () =>
      persistence.getDocumentDetail(
        { userId: "intruder", organizationId: "other-org" },
        SYNTHETIC_WORKSPACE_ID,
        "doc_waiver_001",
      ),
    /access denied/i,
  );
  persistence.close();
});

test("the active mapping view is read from persisted reviewed slots", () => {
  const { persistence } = openSeeded();
  const mapping = persistence.getActiveMappingView(
    actor,
    SYNTHETIC_WORKSPACE_ID,
  );
  assert.ok(mapping);
  assert.equal(mapping.manifestVersion, 1);
  assert.equal(mapping.expectedSlotCount, 10);
  assert.equal(mapping.slots.length, 10);
  for (const slot of mapping.slots) {
    assert.ok(slot.reviewedAt, `${slot.slotKey} must be reviewed`);
    assert.ok(slot.exactQuote.length > 0);
    assert.ok(slot.page > 0);
    assert.ok(slot.documentExternalId.startsWith("doc_"));
  }
  const waiverSlot = mapping.slots.find((slot) => slot.slotKey === "ltv.waiver");
  assert.ok(waiverSlot);
  assert.equal(waiverSlot.documentExternalId, "doc_waiver_001");
  assert.equal(waiverSlot.locator, "Section 2.1");
  assert.match(waiverSlot.exactQuote, /does not amend the Loan-to-Value Ratio/);
  persistence.close();
});

test("demo reset refuses unsafe configurations", () => {
  const directory = temporaryDirectory();
  const base = {
    backend: "sqlite",
    databasePath: path.join(directory, "data", "demo.db"),
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
    allowedDatabaseRoot: path.join(directory, "data"),
  };
  assert.throws(
    () => assertSafeDemoReset({ ...base, backend: "postgres" }),
    /refuses backend/,
  );
  assert.throws(
    () => assertSafeDemoReset({ ...base, allowSyntheticSeed: false }),
    /AGREEMENT_ALLOW_SYNTHETIC_SEED/,
  );
  assert.throws(
    () =>
      assertSafeDemoReset({
        ...base,
        databasePath: path.join(directory, "elsewhere", "demo.db"),
      }),
    /outside/,
  );

  // A database containing any non-synthetic workspace must never be deleted.
  fs.mkdirSync(path.join(directory, "data"), { recursive: true });
  const foreign = new Database(base.databasePath);
  foreign.exec(SQLITE_SCHEMA);
  const now = new Date().toISOString();
  foreign
    .prepare("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)")
    .run("org-real", "Some Org", now);
  foreign
    .prepare(
      `INSERT INTO workspaces
        (id, organization_id, slug, name, description, default_as_of_date,
         mapping_status, created_at, updated_at)
       VALUES (?, ?, 'live', 'Live workspace', '', '2026-01-01', 'unmapped', ?, ?)`,
    )
    .run("ws-real", "org-real", now, now);
  foreign.close();
  assert.throws(() => assertSafeDemoReset(base), /non-synthetic workspaces/);
  fs.rmSync(base.databasePath, { force: true });
});

test("demo reset deterministically restores the synthetic base state", () => {
  const directory = temporaryDirectory();
  const options = {
    backend: "sqlite",
    databasePath: path.join(directory, "data", "demo.db"),
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
    allowedDatabaseRoot: path.join(directory, "data"),
  };

  const first = resetSyntheticDemoState(options);
  assert.equal(first.documentCount, 5);
  assert.equal(first.passageCount, 15);
  assert.equal(first.activeManifestVersion, 1);

  // Mutate, then confirm the reset converges back to the seeded state.
  const mutated = SqlitePersistence.open(options.databasePath, {
    allowSyntheticSeed: false,
    syntheticManifestPath: null,
  });
  mutated.updateWorkspaceName(actor, SYNTHETIC_WORKSPACE_ID, "Renamed demo");
  mutated.close();

  const second = resetSyntheticDemoState(options);
  assert.equal(second.documentCount, 5);
  assert.equal(second.passageCount, 15);
  assert.equal(second.activeManifestVersion, 1);
  const restored = SqlitePersistence.open(options.databasePath, {
    allowSyntheticSeed: false,
    syntheticManifestPath: null,
  });
  const workspace = restored
    .listWorkspaces(actor)
    .find((candidate) => candidate.id === SYNTHETIC_WORKSPACE_ID);
  assert.equal(workspace?.name, "Synthetic Facility A");
  restored.close();
});
