import type {
  CalculatedEngineLtv,
  EngineAnswer,
  EngineCitation,
  SupportStatus,
} from "@/lib/engine-contract";

export type MappingStatus = "unmapped" | "draft" | "invalid" | "ready";

export interface ActorContext {
  userId: string;
  organizationId: string;
}

export interface WorkspaceRecord {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  description: string;
  defaultAsOfDate: string;
  mappingStatus: MappingStatus;
  activeManifestVersion: number | null;
  documentCount: number;
  passageCount: number;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  externalId: string;
  title: string;
  documentType: string;
  effectiveDate: string;
  currentStatus: string;
  storageKey: string | null;
  passageCount: number;
}

export interface PassageRecord {
  id: string;
  locator: string;
  page: number;
  heading: string;
  text: string;
}

export interface DocumentReference {
  externalId: string;
  title: string;
  documentType: string;
  relationship: "modifies" | "modified_by" | "related";
}

export interface DocumentDetail extends DocumentRecord {
  executionDate: string;
  sourcePath: string;
  passages: PassageRecord[];
  relatedDocuments: DocumentReference[];
}

export interface MappingSlotRecord {
  slotKey: string;
  documentExternalId: string;
  documentTitle: string;
  locator: string;
  page: number;
  exactQuote: string;
  reviewedAt: string | null;
}

export interface ActiveMappingView {
  manifestVersion: number;
  activatedAt: string;
  expectedSlotCount: number;
  slots: MappingSlotRecord[];
}

export interface AuditEventRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  occurredAt: string;
  detail: Record<string, unknown>;
}

export interface PassageEvidence {
  passageId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  locator: string;
  page: number;
  text: string;
  sourcePath: string;
}

export interface DashboardSnapshot {
  organizationName: string;
  actorName: string;
  workspace: WorkspaceRecord;
  documents: DocumentRecord[];
  recentEvents: AuditEventRecord[];
  answerCount: number;
  citationCount: number;
  reviewedSlots: number;
  totalSlots: number;
}

export interface PersistedCitation extends EngineCitation {
  id: string;
  ordinal: number;
}

export interface PersistedAnswer
  extends Omit<EngineAnswer, "sources" | "support_status"> {
  id: string;
  workspaceId: string;
  manifestVersion: number | null;
  support_status: SupportStatus;
  testDate: string | null;
  sources: PersistedCitation[];
  createdAt: string;
}

export interface SaveAnswerInput {
  actor: ActorContext;
  workspaceId: string;
  answer: EngineAnswer;
  testDate?: string | null;
}

export interface ActivateMappingDraftInput {
  actor: ActorContext;
  workspaceId: string;
  draftId: string;
  snapshot: Record<string, unknown>;
}

export interface FinancialModelInputRecord {
  key: "debt_amount" | "valuation_amount";
  value: string;
  currency: string;
  effectiveDate: string;
  documentExternalId: string;
  documentTitle: string;
  locator: string;
  page: number;
  exactQuote: string;
}

export interface FinancialModelScenarioRecord {
  scenarioId: string;
  label: string;
  rationale: string;
}

export interface PersistedFinancialModelRun {
  id: string;
  modelVersion: number;
  scenarioId: string;
  result: CalculatedEngineLtv;
  resultSha256: string;
  calculatedAt: string;
}

export interface ActiveFinancialModelView {
  modelId: string;
  version: number;
  calculationPurpose: string;
  formula: string;
  testDate: string;
  evaluationDate: string;
  currency: string;
  activatedAt: string;
  inputs: FinancialModelInputRecord[];
  scenarios: FinancialModelScenarioRecord[];
  latestRuns: PersistedFinancialModelRun[];
}

export interface SaveFinancialModelRunInput {
  actor: ActorContext;
  workspaceId: string;
  calculation: CalculatedEngineLtv;
}

export interface RecordVerificationPackProvenanceInput {
  actor: ActorContext;
  workspaceId: string;
  runId: string;
  scenarioId: string;
  sha256: string;
  engineVersion: string;
  generatedAt: string;
}

export interface Persistence {
  getDashboardSnapshot(
    actor: ActorContext,
    workspaceId: string,
  ): DashboardSnapshot;
  listWorkspaces(actor: ActorContext): WorkspaceRecord[];
  updateWorkspaceName(
    actor: ActorContext,
    workspaceId: string,
    name: string,
  ): WorkspaceRecord;
  saveAnswer(input: SaveAnswerInput): PersistedAnswer;
  getAnswer(
    actor: ActorContext,
    workspaceId: string,
    answerId: string,
  ): PersistedAnswer | null;
  listAnswers(
    actor: ActorContext,
    workspaceId: string,
    limit?: number,
  ): PersistedAnswer[];
  getPassageEvidence(
    actor: ActorContext,
    workspaceId: string,
    documentId: string,
    locator: string,
  ): PassageEvidence;
  getDocumentDetail(
    actor: ActorContext,
    workspaceId: string,
    documentExternalId: string,
  ): DocumentDetail | null;
  getActiveMappingView(
    actor: ActorContext,
    workspaceId: string,
  ): ActiveMappingView | null;
  getActiveFinancialModel(
    actor: ActorContext,
    workspaceId: string,
    modelId: string,
  ): ActiveFinancialModelView | null;
  saveFinancialModelRun(
    input: SaveFinancialModelRunInput,
  ): PersistedFinancialModelRun;
  recordVerificationPackProvenance(
    input: RecordVerificationPackProvenanceInput,
  ): void;
  activateMappingDraft(input: ActivateMappingDraftInput): number;
}
