import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

export const SYNTHETIC_ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";
export const SYNTHETIC_USER_ID = "10000000-0000-4000-8000-000000000002";
export const SYNTHETIC_WORKSPACE_ID =
  "10000000-0000-4000-8000-000000000003";
export const SYNTHETIC_DRAFT_ID = "10000000-0000-4000-8000-000000000004";

interface ManifestDocument {
  document_id: string;
  document_type: string;
  title: string;
  source_path: string;
  execution_date: string;
  effective_date: string;
  current_status: string;
}

interface ManifestProvision {
  document_id: string;
  locator: string;
  quote: string;
}

interface SyntheticManifest {
  workspace_id: string;
  workspace_name: string;
  default_as_of_date: string;
  documents: ManifestDocument[];
  provisions: Record<string, Record<string, ManifestProvision>>;
  [key: string]: unknown;
}

interface SourcePassage {
  locator: string;
  heading: string;
  page: number;
  text: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requiredId(map: Map<string, string>, key: string): string {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Synthetic seed references an unknown identity: ${key}`);
  }
  return value;
}

function parseSyntheticSource(sourcePath: string): SourcePassage[] {
  const passages: SourcePassage[] = [];
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  let page: number | null = null;
  let heading: string | null = null;
  let locator: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (page !== null && heading && locator && text) {
      passages.push({ locator, heading, page, text });
    }
    buffer = [];
  };

  for (const line of lines) {
    const pageMatch = /^<!-- page: (\d+) -->$/.exec(line);
    if (pageMatch) {
      flush();
      page = Number(pageMatch[1]);
      heading = null;
      locator = null;
      continue;
    }
    const headingMatch = /^## (.+)$/.exec(line);
    if (headingMatch) {
      flush();
      heading = headingMatch[1].trim();
      locator = heading.split(" — ", 1)[0].trim();
      continue;
    }
    if (heading) {
      buffer.push(line);
    }
  }
  flush();
  return passages;
}

function assertSyntheticManifest(
  value: unknown,
  manifestPath: string,
): asserts value is SyntheticManifest {
  if (!value || typeof value !== "object") {
    throw new Error("Synthetic manifest must be a JSON object.");
  }
  const manifest = value as Partial<SyntheticManifest>;
  if (
    manifest.workspace_id !== "demo" ||
    !manifest.workspace_name?.toLowerCase().includes("synthetic") ||
    !Array.isArray(manifest.documents) ||
    !manifest.provisions
  ) {
    throw new Error(
      `Refusing to seed ${manifestPath}: expected the tracked synthetic demo manifest.`,
    );
  }
  for (const document of manifest.documents) {
    const source = String(document.source_path);
    if (!source.startsWith("docs/phase-1/synthetic-corpus/")) {
      throw new Error(
        `Refusing non-synthetic source path in seed manifest: ${source}`,
      );
    }
  }
}

export function seedSyntheticDemo(
  database: Database.Database,
  manifestPath: string,
): void {
  const workspaceCount = database
    .prepare("SELECT count(*) AS count FROM workspaces")
    .get() as { count: number };
  if (workspaceCount.count > 0) {
    return;
  }

  const resolvedManifest = path.resolve(manifestPath);
  const parsed: unknown = JSON.parse(
    fs.readFileSync(resolvedManifest, "utf8"),
  );
  assertSyntheticManifest(parsed, resolvedManifest);
  const manifest = parsed;
  const repositoryRoot = path.resolve(path.dirname(resolvedManifest), "..", "..");
  const now = new Date().toISOString();
  const documentIds = new Map<string, string>();
  const passageIds = new Map<string, string>();

  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        "INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)",
      )
      .run(SYNTHETIC_ORGANIZATION_ID, "Synthetic Design Partner", now);
    database
      .prepare(
        "INSERT INTO users (id, display_name, synthetic, created_at) VALUES (?, ?, 1, ?)",
      )
      .run(SYNTHETIC_USER_ID, "Synthetic Reviewer", now);
    database
      .prepare(
        `INSERT INTO organization_memberships
          (organization_id, user_id, role, created_at)
         VALUES (?, ?, 'owner', ?)`,
      )
      .run(SYNTHETIC_ORGANIZATION_ID, SYNTHETIC_USER_ID, now);
    database
      .prepare(
        `INSERT INTO workspaces
          (id, organization_id, slug, name, description, default_as_of_date,
           mapping_status, active_manifest_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ready', 1, ?, ?)`,
      )
      .run(
        SYNTHETIC_WORKSPACE_ID,
        SYNTHETIC_ORGANIZATION_ID,
        manifest.workspace_id,
        manifest.workspace_name,
        "Local synthetic agreement set for the named design-partner workflow.",
        manifest.default_as_of_date,
        now,
        now,
      );

    const insertDocument = database.prepare(
      `INSERT INTO documents
        (id, workspace_id, external_id, document_type, title, effective_date,
         execution_date, current_status, source_path, storage_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    );
    for (const document of manifest.documents) {
      const id = randomUUID();
      documentIds.set(document.document_id, id);
      insertDocument.run(
        id,
        SYNTHETIC_WORKSPACE_ID,
        document.document_id,
        document.document_type,
        document.title,
        document.effective_date,
        document.execution_date,
        document.current_status,
        document.source_path,
        now,
      );
    }

    const insertPassage = database.prepare(
      `INSERT INTO passages
        (id, workspace_id, document_id, locator, page_number, heading,
         passage_text, passage_sha256, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const sourcePassages = new Map<string, SourcePassage>();
    for (const document of manifest.documents) {
      const sourcePath = path.resolve(repositoryRoot, document.source_path);
      if (
        sourcePath !== repositoryRoot &&
        !sourcePath.startsWith(`${repositoryRoot}${path.sep}`)
      ) {
        throw new Error(`Synthetic source escapes repository root: ${sourcePath}`);
      }
      for (const passage of parseSyntheticSource(sourcePath)) {
        const passageKey = `${document.document_id}:${passage.locator}`;
        if (sourcePassages.has(passageKey)) {
          throw new Error(`Duplicate synthetic source passage: ${passageKey}`);
        }
        sourcePassages.set(passageKey, passage);
        const passageId = randomUUID();
        passageIds.set(passageKey, passageId);
        insertPassage.run(
          passageId,
          SYNTHETIC_WORKSPACE_ID,
          requiredId(documentIds, document.document_id),
          passage.locator,
          passage.page,
          passage.heading,
          passage.text,
          sha256(passage.text),
          now,
        );
      }
    }
    const slotCount = Object.values(manifest.provisions).reduce(
      (count, slots) => count + Object.keys(slots).length,
      0,
    );

    database
      .prepare(
        `INSERT INTO mapping_drafts
          (id, workspace_id, created_by, status, expected_slot_count,
           last_validation_errors, created_at, updated_at)
         VALUES (?, ?, ?, 'activated', ?, '[]', ?, ?)`,
      )
      .run(
        SYNTHETIC_DRAFT_ID,
        SYNTHETIC_WORKSPACE_ID,
        SYNTHETIC_USER_ID,
        slotCount,
        now,
        now,
      );

    const insertSlot = database.prepare(
      `INSERT INTO mapping_draft_slots
        (id, draft_id, slot_key, document_id, passage_id, locator, exact_quote,
         values_json, reviewed_by, reviewed_at, validation_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, NULL)`,
    );
    for (const [group, slots] of Object.entries(manifest.provisions)) {
      for (const [key, provision] of Object.entries(slots)) {
        const passageKey = `${provision.document_id}:${provision.locator}`;
        const sourcePassage = sourcePassages.get(passageKey);
        if (!sourcePassage?.text.includes(provision.quote)) {
          throw new Error(
            `Mapped quote is not an exact excerpt of ${passageKey}.`,
          );
        }
        insertSlot.run(
          randomUUID(),
          SYNTHETIC_DRAFT_ID,
          `${group}.${key}`,
          requiredId(documentIds, provision.document_id),
          requiredId(passageIds, passageKey),
          provision.locator,
          provision.quote,
          SYNTHETIC_USER_ID,
          now,
        );
      }
    }

    const snapshot = JSON.stringify(manifest);
    database
      .prepare(
        `INSERT INTO manifest_versions
          (id, workspace_id, version, source_draft_id, snapshot_json,
           snapshot_sha256, activated_by, activated_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        SYNTHETIC_WORKSPACE_ID,
        SYNTHETIC_DRAFT_ID,
        snapshot,
        sha256(snapshot),
        SYNTHETIC_USER_ID,
        now,
      );
    database
      .prepare(
        `INSERT INTO audit_events
          (id, organization_id, workspace_id, actor_user_id, action,
           entity_type, entity_id, detail_json, occurred_at)
         VALUES (?, ?, ?, ?, 'synthetic_demo.seeded', 'workspace', ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        SYNTHETIC_ORGANIZATION_ID,
        SYNTHETIC_WORKSPACE_ID,
        SYNTHETIC_USER_ID,
        SYNTHETIC_WORKSPACE_ID,
        JSON.stringify({ source: "workspaces/demo/manifest.json" }),
        now,
      );
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
