export const SQLITE_SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  synthetic INTEGER NOT NULL CHECK (synthetic IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'reviewer', 'viewer')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_as_of_date TEXT NOT NULL,
  mapping_status TEXT NOT NULL CHECK (
    mapping_status IN ('unmapped', 'draft', 'invalid', 'ready')
  ),
  active_manifest_version INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  execution_date TEXT NOT NULL,
  current_status TEXT NOT NULL,
  source_path TEXT NOT NULL,
  storage_key TEXT,
  content_sha256 TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (workspace_id, external_id),
  CHECK (storage_key IS NULL OR storage_key NOT LIKE '/%')
);

CREATE TABLE IF NOT EXISTS passages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  locator TEXT NOT NULL,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  heading TEXT NOT NULL DEFAULT '',
  passage_text TEXT NOT NULL,
  passage_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (document_id, locator, passage_sha256)
);

CREATE TABLE IF NOT EXISTS mapping_drafts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'invalid', 'activated')),
  expected_slot_count INTEGER NOT NULL CHECK (expected_slot_count >= 0),
  last_validation_errors TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS one_open_mapping_draft
  ON mapping_drafts(workspace_id)
  WHERE status IN ('draft', 'invalid');

CREATE TABLE IF NOT EXISTS mapping_draft_slots (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES mapping_drafts(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  document_id TEXT REFERENCES documents(id),
  passage_id TEXT REFERENCES passages(id),
  locator TEXT,
  exact_quote TEXT,
  values_json TEXT NOT NULL DEFAULT '{}',
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  validation_error TEXT,
  UNIQUE (draft_id, slot_key)
);

CREATE TABLE IF NOT EXISTS manifest_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  source_draft_id TEXT REFERENCES mapping_drafts(id) ON DELETE RESTRICT,
  snapshot_json TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL,
  activated_by TEXT NOT NULL REFERENCES users(id),
  activated_at TEXT NOT NULL,
  UNIQUE (workspace_id, version)
);

CREATE TRIGGER IF NOT EXISTS manifest_versions_no_update
BEFORE UPDATE ON manifest_versions
BEGIN
  SELECT RAISE(ABORT, 'manifest versions are immutable');
END;

CREATE TRIGGER IF NOT EXISTS manifest_versions_no_delete
BEFORE DELETE ON manifest_versions
BEGIN
  SELECT RAISE(ABORT, 'manifest versions are immutable');
END;

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  manifest_version_id TEXT REFERENCES manifest_versions(id) ON DELETE RESTRICT,
  asked_by TEXT NOT NULL REFERENCES users(id),
  question TEXT NOT NULL,
  as_of_date TEXT NOT NULL,
  test_date TEXT,
  support_status TEXT NOT NULL CHECK (
    support_status IN (
      'supported', 'partially_supported', 'source_not_found',
      'legal_review_required'
    )
  ),
  short_answer TEXT NOT NULL,
  assumptions_json TEXT NOT NULL DEFAULT '[]',
  missing_information_json TEXT NOT NULL DEFAULT '[]',
  human_review_required INTEGER NOT NULL CHECK (
    human_review_required IN (0, 1)
  ),
  review_note TEXT NOT NULL DEFAULT '',
  notes_on_currentness TEXT NOT NULL DEFAULT '',
  query_category TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citations (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE RESTRICT,
  ordinal INTEGER NOT NULL CHECK (ordinal > 0),
  supporting_passage TEXT NOT NULL,
  locator TEXT NOT NULL,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  engine_passage_id TEXT NOT NULL DEFAULT '',
  UNIQUE (answer_id, ordinal)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  detail_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS passages_workspace_document_idx
  ON passages(workspace_id, document_id);
CREATE INDEX IF NOT EXISTS audit_workspace_time_idx
  ON audit_events(workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS answers_workspace_time_idx
  ON answers(workspace_id, created_at DESC);
`;
