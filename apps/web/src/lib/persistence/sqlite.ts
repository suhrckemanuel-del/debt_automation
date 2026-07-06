import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { engineLtvCalculationSchema } from "@/lib/engine-contract";
import { SQLITE_SCHEMA } from "./sqlite-schema";
import { seedSyntheticDemo } from "./synthetic-seed";
import type {
  ActivateMappingDraftInput,
  ActiveFinancialModelView,
  ActiveMappingView,
  ActorContext,
  AuditEventRecord,
  DashboardSnapshot,
  DocumentDetail,
  DocumentRecord,
  DocumentReference,
  PassageEvidence,
  Persistence,
  PersistedFinancialModelRun,
  PersistedAnswer,
  PersistedCitation,
  RecordVerificationPackProvenanceInput,
  SaveAnswerInput,
  SaveFinancialModelRunInput,
  WorkspaceRecord,
} from "./types";

type SqlValue = string | number | null;

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function parseJsonStrings(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Persisted answer contains invalid string-list data.");
  }
  return parsed;
}

function ensureColumn(
  database: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (!columns.some((candidate) => candidate.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function applyCompatibilityMigrations(database: Database.Database): void {
  ensureColumn(database, "answers", "test_date", "TEXT");
  ensureColumn(
    database,
    "answers",
    "assumptions_json",
    "TEXT NOT NULL DEFAULT '[]'",
  );
  ensureColumn(
    database,
    "answers",
    "review_note",
    "TEXT NOT NULL DEFAULT ''",
  );
  ensureColumn(
    database,
    "answers",
    "notes_on_currentness",
    "TEXT NOT NULL DEFAULT ''",
  );
  ensureColumn(
    database,
    "answers",
    "query_category",
    "TEXT NOT NULL DEFAULT 'unknown'",
  );
  ensureColumn(
    database,
    "citations",
    "engine_passage_id",
    "TEXT NOT NULL DEFAULT ''",
  );
  database
    .prepare(
      `INSERT OR IGNORE INTO schema_migrations (version, applied_at)
       VALUES (2, ?)`,
    )
    .run(new Date().toISOString());
}

export class SqlitePersistence implements Persistence {
  constructor(
    private readonly database: Database.Database,
    private readonly databasePath: string,
  ) {}

  static open(
    databasePath: string,
    options: {
      allowSyntheticSeed: boolean;
      syntheticManifestPath: string | null;
    },
  ): SqlitePersistence {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    const database = new Database(databasePath);
    database.exec(SQLITE_SCHEMA);
    applyCompatibilityMigrations(database);
    database
      .prepare(
        `INSERT OR IGNORE INTO schema_migrations (version, applied_at)
         VALUES (1, ?)`,
      )
      .run(new Date().toISOString());

    if (options.allowSyntheticSeed) {
      if (!options.syntheticManifestPath) {
        throw new Error("Synthetic manifest path is required for seeding.");
      }
      seedSyntheticDemo(database, options.syntheticManifestPath);
    }
    return new SqlitePersistence(database, databasePath);
  }

  close(): void {
    this.database.close();
  }

  get path(): string {
    return this.databasePath;
  }

  private assertMembership(actor: ActorContext): void {
    const membership = this.database
      .prepare(
        `SELECT role FROM organization_memberships
         WHERE organization_id = ? AND user_id = ?`,
      )
      .get(actor.organizationId, actor.userId);
    if (!membership) {
      throw new Error("Workspace access denied: organization membership required.");
    }
  }

  private assertWorkspaceAccess(
    actor: ActorContext,
    workspaceId: string,
  ): void {
    this.assertMembership(actor);
    const workspace = this.database
      .prepare(
        `SELECT id FROM workspaces
         WHERE id = ? AND organization_id = ?`,
      )
      .get(workspaceId, actor.organizationId);
    if (!workspace) {
      throw new Error("Workspace access denied.");
    }
  }

  private workspaceFromRow(row: Record<string, SqlValue>): WorkspaceRecord {
    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      slug: String(row.slug),
      name: String(row.name),
      description: String(row.description),
      defaultAsOfDate: String(row.default_as_of_date),
      mappingStatus: String(row.mapping_status) as WorkspaceRecord["mappingStatus"],
      activeManifestVersion:
        row.active_manifest_version === null
          ? null
          : Number(row.active_manifest_version),
      documentCount: Number(row.document_count),
      passageCount: Number(row.passage_count),
      updatedAt: String(row.updated_at),
    };
  }

  private workspaceQuery(where: string): string {
    return `
      SELECT
        w.*,
        (SELECT count(*) FROM documents d WHERE d.workspace_id = w.id)
          AS document_count,
        (SELECT count(*) FROM passages p WHERE p.workspace_id = w.id)
          AS passage_count
      FROM workspaces w
      ${where}
    `;
  }

  listWorkspaces(actor: ActorContext): WorkspaceRecord[] {
    this.assertMembership(actor);
    const rows = this.database
      .prepare(
        this.workspaceQuery(
          "WHERE w.organization_id = ? ORDER BY w.updated_at DESC",
        ),
      )
      .all(actor.organizationId) as Record<string, SqlValue>[];
    return rows.map((row) => this.workspaceFromRow(row));
  }

  private getWorkspace(
    actor: ActorContext,
    workspaceId: string,
  ): WorkspaceRecord {
    this.assertWorkspaceAccess(actor, workspaceId);
    const row = this.database
      .prepare(
        this.workspaceQuery(
          "WHERE w.id = ? AND w.organization_id = ? LIMIT 1",
        ),
      )
      .get(workspaceId, actor.organizationId) as
      | Record<string, SqlValue>
      | undefined;
    if (!row) {
      throw new Error("Workspace not found.");
    }
    return this.workspaceFromRow(row);
  }

  private listDocuments(workspaceId: string): DocumentRecord[] {
    const rows = this.database
      .prepare(
        `SELECT d.*,
          (SELECT count(*) FROM passages p WHERE p.document_id = d.id)
            AS passage_count
         FROM documents d
         WHERE d.workspace_id = ?
         ORDER BY d.effective_date, d.title`,
      )
      .all(workspaceId) as Record<string, SqlValue>[];
    return rows.map((row) => ({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      externalId: String(row.external_id),
      title: String(row.title),
      documentType: String(row.document_type),
      effectiveDate: String(row.effective_date),
      currentStatus: String(row.current_status),
      storageKey: row.storage_key === null ? null : String(row.storage_key),
      passageCount: Number(row.passage_count),
    }));
  }

  private listAuditEvents(workspaceId: string): AuditEventRecord[] {
    const rows = this.database
      .prepare(
        `SELECT id, action, entity_type, entity_id, detail_json, occurred_at
         FROM audit_events
         WHERE workspace_id = ?
         ORDER BY occurred_at DESC
         LIMIT 8`,
      )
      .all(workspaceId) as Record<string, SqlValue>[];
    return rows.map((row) => ({
      id: String(row.id),
      action: String(row.action),
      entityType: String(row.entity_type),
      entityId: row.entity_id === null ? null : String(row.entity_id),
      detail: parseJsonObject(String(row.detail_json)),
      occurredAt: String(row.occurred_at),
    }));
  }

  getDashboardSnapshot(
    actor: ActorContext,
    workspaceId: string,
  ): DashboardSnapshot {
    const workspace = this.getWorkspace(actor, workspaceId);
    const identity = this.database
      .prepare(
        `SELECT o.name AS organization_name, u.display_name AS actor_name
         FROM organizations o
         JOIN organization_memberships m ON m.organization_id = o.id
         JOIN users u ON u.id = m.user_id
         WHERE o.id = ? AND u.id = ?`,
      )
      .get(actor.organizationId, actor.userId) as
      | { organization_name: string; actor_name: string }
      | undefined;
    if (!identity) {
      throw new Error("Actor identity is not available.");
    }
    const counts = this.database
      .prepare(
        `SELECT
          (SELECT count(*) FROM answers WHERE workspace_id = ?) AS answer_count,
          (SELECT count(*) FROM citations c
             JOIN answers a ON a.id = c.answer_id
           WHERE a.workspace_id = ?) AS citation_count,
          (SELECT count(*) FROM mapping_draft_slots s
             JOIN mapping_drafts d ON d.id = s.draft_id
           WHERE d.workspace_id = ? AND s.reviewed_at IS NOT NULL
             AND s.validation_error IS NULL) AS reviewed_slots,
          (SELECT coalesce(max(expected_slot_count), 0)
             FROM mapping_drafts WHERE workspace_id = ?) AS total_slots`,
      )
      .get(workspaceId, workspaceId, workspaceId, workspaceId) as {
      answer_count: number;
      citation_count: number;
      reviewed_slots: number;
      total_slots: number;
    };

    return {
      organizationName: identity.organization_name,
      actorName: identity.actor_name,
      workspace,
      documents: this.listDocuments(workspaceId),
      recentEvents: this.listAuditEvents(workspaceId),
      answerCount: Number(counts.answer_count),
      citationCount: Number(counts.citation_count),
      reviewedSlots: Number(counts.reviewed_slots),
      totalSlots: Number(counts.total_slots),
    };
  }

  updateWorkspaceName(
    actor: ActorContext,
    workspaceId: string,
    name: string,
  ): WorkspaceRecord {
    this.assertWorkspaceAccess(actor, workspaceId);
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 80) {
      throw new Error("Workspace name must contain 3 to 80 characters.");
    }
    const now = new Date().toISOString();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(
          `UPDATE workspaces SET name = ?, updated_at = ?
           WHERE id = ? AND organization_id = ?`,
        )
        .run(trimmed, now, workspaceId, actor.organizationId);
      this.database
        .prepare(
          `INSERT INTO audit_events
            (id, organization_id, workspace_id, actor_user_id, action,
             entity_type, entity_id, detail_json, occurred_at)
           VALUES (?, ?, ?, ?, 'workspace.renamed', 'workspace', ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          actor.organizationId,
          workspaceId,
          actor.userId,
          workspaceId,
          JSON.stringify({ name: trimmed }),
          now,
        );
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    return this.getWorkspace(actor, workspaceId);
  }

  private citationsForAnswer(answerId: string): PersistedCitation[] {
    const rows = this.database
      .prepare(
        `SELECT c.id, c.ordinal, c.supporting_passage, c.locator,
                c.page_number, c.engine_passage_id,
                d.external_id, d.title, d.document_type, d.source_path
         FROM citations c
         JOIN passages p ON p.id = c.passage_id
         JOIN documents d ON d.id = p.document_id
         WHERE c.answer_id = ?
         ORDER BY c.ordinal`,
      )
      .all(answerId) as Record<string, SqlValue>[];
    return rows.map((row) => ({
      id: String(row.id),
      ordinal: Number(row.ordinal),
      document_id: String(row.external_id),
      document_title: String(row.title),
      document_type: String(row.document_type),
      locator: String(row.locator),
      page: Number(row.page_number),
      passage_id: String(row.engine_passage_id),
      supporting_passage: String(row.supporting_passage),
      source_path: String(row.source_path),
    }));
  }

  private answerFromRow(row: Record<string, SqlValue>): PersistedAnswer {
    const id = String(row.id);
    return {
      id,
      workspaceId: String(row.workspace_id),
      manifestVersion:
        row.manifest_version === null ? null : Number(row.manifest_version),
      question: String(row.question),
      as_of_date: String(row.as_of_date),
      testDate: row.test_date === null ? null : String(row.test_date),
      short_answer: String(row.short_answer),
      support_status:
        String(row.support_status) as PersistedAnswer["support_status"],
      sources: this.citationsForAnswer(id),
      assumptions: parseJsonStrings(String(row.assumptions_json)),
      missing_information: parseJsonStrings(
        String(row.missing_information_json),
      ),
      human_review_required: Boolean(row.human_review_required),
      review_note: String(row.review_note),
      notes_on_currentness: String(row.notes_on_currentness),
      query_category: String(row.query_category),
      createdAt: String(row.created_at),
    };
  }

  getAnswer(
    actor: ActorContext,
    workspaceId: string,
    answerId: string,
  ): PersistedAnswer | null {
    this.assertWorkspaceAccess(actor, workspaceId);
    const row = this.database
      .prepare(
        `SELECT a.*, mv.version AS manifest_version
         FROM answers a
         LEFT JOIN manifest_versions mv ON mv.id = a.manifest_version_id
         WHERE a.id = ? AND a.workspace_id = ?`,
      )
      .get(answerId, workspaceId) as Record<string, SqlValue> | undefined;
    return row ? this.answerFromRow(row) : null;
  }

  listAnswers(
    actor: ActorContext,
    workspaceId: string,
    limit = 8,
  ): PersistedAnswer[] {
    this.assertWorkspaceAccess(actor, workspaceId);
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const rows = this.database
      .prepare(
        `SELECT a.*, mv.version AS manifest_version
         FROM answers a
         LEFT JOIN manifest_versions mv ON mv.id = a.manifest_version_id
         WHERE a.workspace_id = ?
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT ?`,
      )
      .all(workspaceId, boundedLimit) as Record<string, SqlValue>[];
    return rows.map((row) => this.answerFromRow(row));
  }

  getPassageEvidence(
    actor: ActorContext,
    workspaceId: string,
    documentId: string,
    locator: string,
  ): PassageEvidence {
    this.assertWorkspaceAccess(actor, workspaceId);
    const row = this.database
      .prepare(
        `SELECT p.id AS passage_id, p.locator, p.page_number,
                p.passage_text, d.external_id, d.title,
                d.document_type, d.source_path
         FROM passages p
         JOIN documents d ON d.id = p.document_id
         WHERE p.workspace_id = ?
           AND d.external_id = ?
           AND p.locator = ?`,
      )
      .get(workspaceId, documentId, locator) as
      | Record<string, SqlValue>
      | undefined;
    if (!row) {
      throw new Error(
        `Persisted passage not found: ${documentId} ${locator}.`,
      );
    }
    return {
      passageId: String(row.passage_id),
      documentId: String(row.external_id),
      documentTitle: String(row.title),
      documentType: String(row.document_type),
      locator: String(row.locator),
      page: Number(row.page_number),
      text: String(row.passage_text),
      sourcePath: String(row.source_path),
    };
  }

  private activeManifestSnapshot(
    workspaceId: string,
  ): Record<string, unknown> | null {
    const row = this.database
      .prepare(
        `SELECT mv.snapshot_json
         FROM workspaces w
         JOIN manifest_versions mv
           ON mv.workspace_id = w.id
          AND mv.version = w.active_manifest_version
         WHERE w.id = ?`,
      )
      .get(workspaceId) as { snapshot_json: string } | undefined;
    return row ? parseJsonObject(row.snapshot_json) : null;
  }

  private documentRelationships(
    workspaceId: string,
    documentExternalId: string,
  ): DocumentReference[] {
    const snapshot = this.activeManifestSnapshot(workspaceId);
    const declared = Array.isArray(snapshot?.documents)
      ? (snapshot.documents as Record<string, unknown>[])
      : [];
    const byRelationship = new Map<string, DocumentReference["relationship"]>();
    const claim = (
      externalId: unknown,
      relationship: DocumentReference["relationship"],
    ) => {
      if (
        typeof externalId !== "string" ||
        externalId === documentExternalId ||
        externalId.length === 0
      ) {
        return;
      }
      // Modification relationships are more specific than "related".
      const existing = byRelationship.get(externalId);
      if (!existing || existing === "related") {
        byRelationship.set(externalId, relationship);
      }
    };
    for (const entry of declared) {
      const entryId = entry.document_id;
      if (entryId === documentExternalId) {
        claim(entry.modifies_document_id, "modifies");
        if (Array.isArray(entry.related_document_ids)) {
          for (const related of entry.related_document_ids) {
            claim(related, "related");
          }
        }
      } else {
        if (entry.modifies_document_id === documentExternalId) {
          claim(entryId, "modified_by");
        }
        if (
          Array.isArray(entry.related_document_ids) &&
          entry.related_document_ids.includes(documentExternalId)
        ) {
          claim(entryId, "related");
        }
      }
    }
    if (byRelationship.size === 0) {
      return [];
    }
    // Only reference documents that remain persisted in this workspace.
    return this.listDocuments(workspaceId)
      .filter((document) => byRelationship.has(document.externalId))
      .map((document) => ({
        externalId: document.externalId,
        title: document.title,
        documentType: document.documentType,
        relationship: byRelationship.get(document.externalId)!,
      }));
  }

  getDocumentDetail(
    actor: ActorContext,
    workspaceId: string,
    documentExternalId: string,
  ): DocumentDetail | null {
    this.assertWorkspaceAccess(actor, workspaceId);
    const row = this.database
      .prepare(
        `SELECT d.*,
          (SELECT count(*) FROM passages p WHERE p.document_id = d.id)
            AS passage_count
         FROM documents d
         WHERE d.workspace_id = ? AND d.external_id = ?`,
      )
      .get(workspaceId, documentExternalId) as
      | Record<string, SqlValue>
      | undefined;
    if (!row) {
      return null;
    }
    const passages = this.database
      .prepare(
        `SELECT id, locator, page_number, heading, passage_text
         FROM passages
         WHERE workspace_id = ? AND document_id = ?
         ORDER BY page_number, locator`,
      )
      .all(workspaceId, String(row.id)) as Record<string, SqlValue>[];
    return {
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      externalId: String(row.external_id),
      title: String(row.title),
      documentType: String(row.document_type),
      effectiveDate: String(row.effective_date),
      executionDate: String(row.execution_date),
      currentStatus: String(row.current_status),
      storageKey: row.storage_key === null ? null : String(row.storage_key),
      sourcePath: String(row.source_path),
      passageCount: Number(row.passage_count),
      passages: passages.map((passage) => ({
        id: String(passage.id),
        locator: String(passage.locator),
        page: Number(passage.page_number),
        heading: String(passage.heading),
        text: String(passage.passage_text),
      })),
      relatedDocuments: this.documentRelationships(
        workspaceId,
        documentExternalId,
      ),
    };
  }

  getActiveMappingView(
    actor: ActorContext,
    workspaceId: string,
  ): ActiveMappingView | null {
    this.assertWorkspaceAccess(actor, workspaceId);
    const manifest = this.database
      .prepare(
        `SELECT mv.version, mv.activated_at, mv.source_draft_id,
                md.expected_slot_count
         FROM workspaces w
         JOIN manifest_versions mv
           ON mv.workspace_id = w.id
          AND mv.version = w.active_manifest_version
         LEFT JOIN mapping_drafts md ON md.id = mv.source_draft_id
         WHERE w.id = ? AND w.organization_id = ?`,
      )
      .get(workspaceId, actor.organizationId) as
      | {
          version: number;
          activated_at: string;
          source_draft_id: string | null;
          expected_slot_count: number | null;
        }
      | undefined;
    if (!manifest?.source_draft_id) {
      return null;
    }
    const rows = this.database
      .prepare(
        `SELECT s.slot_key, s.locator, s.exact_quote, s.reviewed_at,
                d.external_id, d.title, p.page_number, p.passage_text
         FROM mapping_draft_slots s
         JOIN documents d ON d.id = s.document_id
         JOIN passages p ON p.id = s.passage_id
         WHERE s.draft_id = ? AND s.validation_error IS NULL
         ORDER BY s.slot_key`,
      )
      .all(manifest.source_draft_id) as Record<string, SqlValue>[];
    const slots = rows.map((row) => {
      const exactQuote = String(row.exact_quote);
      if (!String(row.passage_text).includes(exactQuote)) {
        throw new Error(
          `Activated mapping quote is not an exact persisted excerpt: ${String(row.slot_key)}.`,
        );
      }
      return {
        slotKey: String(row.slot_key),
        documentExternalId: String(row.external_id),
        documentTitle: String(row.title),
        locator: String(row.locator),
        page: Number(row.page_number),
        exactQuote,
        reviewedAt: row.reviewed_at === null ? null : String(row.reviewed_at),
      };
    });
    return {
      manifestVersion: Number(manifest.version),
      activatedAt: String(manifest.activated_at),
      expectedSlotCount: Number(manifest.expected_slot_count ?? slots.length),
      slots,
    };
  }

  getActiveFinancialModel(
    actor: ActorContext,
    workspaceId: string,
    modelId: string,
  ): ActiveFinancialModelView | null {
    this.assertWorkspaceAccess(actor, workspaceId);
    const version = this.database
      .prepare(
        `SELECT fmv.id, fmv.model_id, fmv.version,
                fmv.calculation_purpose, fmv.formula, fmv.test_date,
                fmv.evaluation_date, fmv.currency, fmv.config_json,
                fmv.activated_at
         FROM workspace_financial_model_heads head
         JOIN financial_model_versions fmv ON fmv.id = head.model_version_id
         WHERE head.workspace_id = ? AND head.model_id = ?`,
      )
      .get(workspaceId, modelId) as Record<string, SqlValue> | undefined;
    if (!version) {
      return null;
    }
    const inputs = this.database
      .prepare(
        `SELECT fmi.input_key, fmi.decimal_value, fmi.currency,
                fmi.effective_date, fmi.exact_quote, p.locator, p.page_number,
                p.passage_text, d.external_id, d.title
         FROM financial_model_inputs fmi
         JOIN passages p ON p.id = fmi.passage_id
         JOIN documents d ON d.id = p.document_id
         WHERE fmi.model_version_id = ?
         ORDER BY fmi.input_key`,
      )
      .all(String(version.id)) as Record<string, SqlValue>[];
    const checkedInputs = inputs.map((input) => {
      const exactQuote = String(input.exact_quote);
      if (!String(input.passage_text).includes(exactQuote)) {
        throw new Error(
          `Financial input is not an exact persisted excerpt: ${String(input.input_key)}.`,
        );
      }
      return {
        key: String(input.input_key) as "debt_amount" | "valuation_amount",
        value: String(input.decimal_value),
        currency: String(input.currency),
        effectiveDate: String(input.effective_date),
        documentExternalId: String(input.external_id),
        documentTitle: String(input.title),
        locator: String(input.locator),
        page: Number(input.page_number),
        exactQuote,
      };
    });
    const config = parseJsonObject(String(version.config_json));
    const configuredScenarios = Array.isArray(config.scenarios)
      ? (config.scenarios as Record<string, unknown>[])
      : [];
    const runRows = this.database
      .prepare(
        `SELECT rowid, id, scenario_id, result_json, result_sha256, calculated_at
         FROM financial_model_runs
         WHERE workspace_id = ? AND model_version_id = ?
         ORDER BY calculated_at DESC, rowid DESC`,
      )
      .all(workspaceId, String(version.id)) as Record<string, SqlValue>[];
    const latestByScenario = new Map<string, PersistedFinancialModelRun>();
    for (const row of runRows) {
      const scenarioId = String(row.scenario_id);
      if (latestByScenario.has(scenarioId)) {
        continue;
      }
      const resultJson = String(row.result_json);
      const persistedHash = String(row.result_sha256);
      const computedHash = createHash("sha256")
        .update(resultJson, "utf8")
        .digest("hex");
      if (computedHash !== persistedHash) {
        throw new Error(
          `Persisted model run hash mismatch: ${String(row.id)}.`,
        );
      }
      const parsed = engineLtvCalculationSchema.parse(
        JSON.parse(resultJson),
      );
      if (parsed.status !== "calculated_human_review_required") {
        throw new Error("Persisted model run is not a calculated result.");
      }
      latestByScenario.set(scenarioId, {
        id: String(row.id),
        modelVersion: Number(version.version),
        scenarioId,
        result: parsed,
        resultSha256: persistedHash,
        calculatedAt: String(row.calculated_at),
      });
    }
    return {
      modelId: String(version.model_id),
      version: Number(version.version),
      calculationPurpose: String(version.calculation_purpose),
      formula: String(version.formula),
      testDate: String(version.test_date),
      evaluationDate: String(version.evaluation_date),
      currency: String(version.currency),
      activatedAt: String(version.activated_at),
      inputs: checkedInputs,
      scenarios: configuredScenarios.map((scenario) => ({
        scenarioId: String(scenario.scenario_id),
        label: String(scenario.label),
        rationale: String(scenario.rationale),
      })),
      latestRuns: [...latestByScenario.values()],
    };
  }

  saveFinancialModelRun(
    input: SaveFinancialModelRunInput,
  ): PersistedFinancialModelRun {
    const { actor, workspaceId, calculation } = input;
    this.assertWorkspaceAccess(actor, workspaceId);
    const active = this.database
      .prepare(
        `SELECT fmv.id, fmv.version, fmv.formula, fmv.test_date,
                fmv.evaluation_date, fmv.currency
         FROM workspace_financial_model_heads head
         JOIN financial_model_versions fmv ON fmv.id = head.model_version_id
         WHERE head.workspace_id = ? AND head.model_id = ?`,
      )
      .get(workspaceId, calculation.model_id) as
      | {
          id: string;
          version: number;
          formula: string;
          test_date: string;
          evaluation_date: string;
          currency: string;
        }
      | undefined;
    if (
      !active ||
      active.version !== calculation.model_version ||
      active.formula !== calculation.formula.expression ||
      active.test_date !== calculation.test_date ||
      active.evaluation_date !== calculation.evaluation_date ||
      active.currency !== calculation.currency
    ) {
      throw new Error(
        "Calculation does not match the active financial model version.",
      );
    }

    for (const citation of calculation.sources) {
      const passage = this.database
        .prepare(
          `SELECT p.page_number, p.passage_text, d.title, d.document_type,
                  d.source_path
           FROM passages p
           JOIN documents d ON d.id = p.document_id
           WHERE p.workspace_id = ? AND d.external_id = ? AND p.locator = ?`,
        )
        .get(
          workspaceId,
          citation.document_id,
          citation.locator,
        ) as
        | {
            page_number: number;
            passage_text: string;
            title: string;
            document_type: string;
            source_path: string;
          }
        | undefined;
      if (
        !passage ||
        passage.page_number !== citation.page ||
        passage.title !== citation.document_title ||
        passage.document_type !== citation.document_type ||
        passage.source_path !== citation.source_path ||
        !passage.passage_text.includes(citation.supporting_passage)
      ) {
        throw new Error(
          `Model citation is not an exact persisted source excerpt: ${citation.document_id} ${citation.locator}.`,
        );
      }
    }

    const persistedInputs = this.database
      .prepare(
        `SELECT input_key, decimal_value, currency, effective_date
         FROM financial_model_inputs WHERE model_version_id = ?`,
      )
      .all(active.id) as Array<{
      input_key: "debt_amount" | "valuation_amount";
      decimal_value: string;
      currency: string;
      effective_date: string;
    }>;
    for (const inputRow of persistedInputs) {
      const sourceInput = calculation.source_inputs[inputRow.input_key];
      if (
        !sourceInput ||
        sourceInput.value !== inputRow.decimal_value ||
        sourceInput.effective_date !== inputRow.effective_date ||
        calculation.currency !== inputRow.currency
      ) {
        throw new Error(
          `Calculation source input does not match persisted ${inputRow.input_key}.`,
        );
      }
    }

    const runId = randomUUID();
    const resultJson = JSON.stringify(calculation);
    const resultSha256 = createHash("sha256")
      .update(resultJson, "utf8")
      .digest("hex");
    const now = new Date().toISOString();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(
          `INSERT INTO financial_model_runs
            (id, workspace_id, model_version_id, calculated_by, scenario_id,
             result_json, result_sha256, calculated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          runId,
          workspaceId,
          active.id,
          actor.userId,
          calculation.scenario.scenario_id,
          resultJson,
          resultSha256,
          now,
        );
      this.database
        .prepare(
          `INSERT INTO audit_events
            (id, organization_id, workspace_id, actor_user_id, action,
             entity_type, entity_id, detail_json, occurred_at)
           VALUES (?, ?, ?, ?, 'financial_model.calculated',
             'financial_model_run', ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          actor.organizationId,
          workspaceId,
          actor.userId,
          runId,
          JSON.stringify({
            modelId: calculation.model_id,
            modelVersion: calculation.model_version,
            scenarioId: calculation.scenario.scenario_id,
            resultSha256,
          }),
          now,
        );
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    return {
      id: runId,
      modelVersion: active.version,
      scenarioId: calculation.scenario.scenario_id,
      result: calculation,
      resultSha256,
      calculatedAt: now,
    };
  }

  recordVerificationPackProvenance(
    input: RecordVerificationPackProvenanceInput,
  ): void {
    const { actor, workspaceId, runId, scenarioId } = input;
    this.assertWorkspaceAccess(actor, workspaceId);
    const run = this.database
      .prepare(
        `SELECT id FROM financial_model_runs
         WHERE id = ? AND workspace_id = ? AND scenario_id = ?`,
      )
      .get(runId, workspaceId, scenarioId) as { id: string } | undefined;
    if (!run) {
      throw new Error(
        "Verification pack provenance must reference a persisted model run.",
      );
    }
    this.database
      .prepare(
        `INSERT INTO audit_events
          (id, organization_id, workspace_id, actor_user_id, action,
           entity_type, entity_id, detail_json, occurred_at)
         VALUES (?, ?, ?, ?, 'financial_model.verification_pack_generated',
           'financial_model_run', ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        actor.organizationId,
        workspaceId,
        actor.userId,
        runId,
        JSON.stringify({
          scenarioId,
          sha256: input.sha256,
          engineVersion: input.engineVersion,
          generatedAt: input.generatedAt,
        }),
        new Date().toISOString(),
      );
  }

  saveAnswer(input: SaveAnswerInput): PersistedAnswer {
    const { actor, workspaceId, answer, testDate = null } = input;
    this.assertWorkspaceAccess(actor, workspaceId);
    if (answer.question.trim().length === 0 || answer.question.length > 4000) {
      throw new Error("Answer question must contain 1 to 4000 characters.");
    }
    if (
      (answer.support_status === "source_not_found" &&
        answer.sources.length !== 0) ||
      (answer.support_status !== "source_not_found" &&
        answer.sources.length === 0)
    ) {
      throw new Error(
        "Answer citation count is inconsistent with its support status.",
      );
    }

    const answerId = randomUUID();
    const now = new Date().toISOString();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const activeManifest = this.database
        .prepare(
          `SELECT mv.id, mv.version
           FROM workspaces w
           LEFT JOIN manifest_versions mv
             ON mv.workspace_id = w.id
            AND mv.version = w.active_manifest_version
           WHERE w.id = ? AND w.organization_id = ?`,
        )
        .get(workspaceId, actor.organizationId) as
        | { id: string; version: number }
        | undefined;
      if (!activeManifest?.id) {
        throw new Error("An active manifest is required before saving answers.");
      }

      const resolvedCitations = answer.sources.map((citation) => {
        const passage = this.database
          .prepare(
            `SELECT p.id, p.page_number, p.passage_text,
                    d.title, d.document_type, d.source_path
             FROM passages p
             JOIN documents d ON d.id = p.document_id
             WHERE p.workspace_id = ?
               AND d.external_id = ?
               AND p.locator = ?`,
          )
          .get(workspaceId, citation.document_id, citation.locator) as
          | {
              id: string;
              page_number: number;
              passage_text: string;
              title: string;
              document_type: string;
              source_path: string;
            }
          | undefined;
        if (
          !passage ||
          passage.page_number !== citation.page ||
          passage.title !== citation.document_title ||
          passage.document_type !== citation.document_type ||
          passage.source_path !== citation.source_path ||
          !passage.passage_text.includes(citation.supporting_passage)
        ) {
          throw new Error(
            `Citation is not an exact persisted source excerpt: ${citation.document_id} ${citation.locator}.`,
          );
        }
        return { citation, persistedPassageId: passage.id };
      });

      this.database
        .prepare(
          `INSERT INTO answers
            (id, workspace_id, manifest_version_id, asked_by, question,
             as_of_date, test_date, support_status, short_answer,
             assumptions_json, missing_information_json,
             human_review_required, review_note, notes_on_currentness,
             query_category, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          answerId,
          workspaceId,
          activeManifest.id,
          actor.userId,
          answer.question,
          answer.as_of_date,
          testDate,
          answer.support_status,
          answer.short_answer,
          JSON.stringify(answer.assumptions),
          JSON.stringify(answer.missing_information),
          answer.human_review_required ? 1 : 0,
          answer.review_note,
          answer.notes_on_currentness,
          answer.query_category,
          now,
        );
      const insertCitation = this.database.prepare(
        `INSERT INTO citations
          (id, answer_id, passage_id, ordinal, supporting_passage,
           locator, page_number, engine_passage_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const [index, resolved] of resolvedCitations.entries()) {
        insertCitation.run(
          randomUUID(),
          answerId,
          resolved.persistedPassageId,
          index + 1,
          resolved.citation.supporting_passage,
          resolved.citation.locator,
          resolved.citation.page,
          resolved.citation.passage_id,
        );
      }
      this.database
        .prepare(
          `INSERT INTO audit_events
            (id, organization_id, workspace_id, actor_user_id, action,
             entity_type, entity_id, detail_json, occurred_at)
           VALUES (?, ?, ?, ?, 'answer.created', 'answer', ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          actor.organizationId,
          workspaceId,
          actor.userId,
          answerId,
          JSON.stringify({
            supportStatus: answer.support_status,
            citationCount: resolvedCitations.length,
            manifestVersion: activeManifest.version,
          }),
          now,
        );
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    const saved = this.getAnswer(actor, workspaceId, answerId);
    if (!saved) {
      throw new Error("Saved answer could not be reloaded.");
    }
    return saved;
  }

  activateMappingDraft(input: ActivateMappingDraftInput): number {
    const { actor, workspaceId, draftId, snapshot } = input;
    this.assertWorkspaceAccess(actor, workspaceId);
    const serialized = JSON.stringify(snapshot);
    const snapshotHash = createHash("sha256")
      .update(serialized, "utf8")
      .digest("hex");
    const now = new Date().toISOString();

    this.database.exec("BEGIN IMMEDIATE");
    try {
      const draft = this.database
        .prepare(
          `SELECT status, expected_slot_count, last_validation_errors
           FROM mapping_drafts
           WHERE id = ? AND workspace_id = ?`,
        )
        .get(draftId, workspaceId) as
        | {
            status: string;
            expected_slot_count: number;
            last_validation_errors: string;
          }
        | undefined;
      if (!draft || !["draft", "invalid"].includes(draft.status)) {
        throw new Error("Only an open mapping draft can be activated.");
      }
      const reviewed = this.database
        .prepare(
          `SELECT count(*) AS count FROM mapping_draft_slots
           WHERE draft_id = ? AND reviewed_at IS NOT NULL
             AND validation_error IS NULL`,
        )
        .get(draftId) as { count: number };
      const errors: unknown = JSON.parse(draft.last_validation_errors);
      if (
        Number(reviewed.count) !== Number(draft.expected_slot_count) ||
        (Array.isArray(errors) && errors.length > 0)
      ) {
        throw new Error(
          "Mapping activation requires every slot to be reviewed and source-valid.",
        );
      }

      const current = this.database
        .prepare(
          `SELECT coalesce(max(version), 0) AS version
           FROM manifest_versions WHERE workspace_id = ?`,
        )
        .get(workspaceId) as { version: number };
      const version = Number(current.version) + 1;
      this.database
        .prepare(
          `INSERT INTO manifest_versions
            (id, workspace_id, version, source_draft_id, snapshot_json,
             snapshot_sha256, activated_by, activated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          workspaceId,
          version,
          draftId,
          serialized,
          snapshotHash,
          actor.userId,
          now,
        );
      this.database
        .prepare(
          `UPDATE workspaces SET active_manifest_version = ?,
             mapping_status = 'ready', updated_at = ?
           WHERE id = ? AND organization_id = ?`,
        )
        .run(version, now, workspaceId, actor.organizationId);
      this.database
        .prepare(
          `UPDATE mapping_drafts SET status = 'activated', updated_at = ?
           WHERE id = ?`,
        )
        .run(now, draftId);
      this.database
        .prepare(
          `INSERT INTO audit_events
            (id, organization_id, workspace_id, actor_user_id, action,
             entity_type, entity_id, detail_json, occurred_at)
           VALUES (?, ?, ?, ?, 'mapping.activated', 'manifest_version', ?,
             ?, ?)`,
        )
        .run(
          randomUUID(),
          actor.organizationId,
          workspaceId,
          actor.userId,
          `${workspaceId}:${version}`,
          JSON.stringify({ version, draftId, snapshotHash }),
          now,
        );
      this.database.exec("COMMIT");
      return version;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}
