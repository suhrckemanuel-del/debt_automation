import type {
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
  activateMappingDraft(input: ActivateMappingDraftInput): number;
}
