# Hosted persistence target

`migrations/202607020001_persistence_foundation.sql` defines the intended
Supabase/Postgres/Auth/private Storage model. This local milestone does not
apply it to a cloud project and contains no project URL, key, password, or real
agreement data.

The migration enforces organization membership at the data layer with RLS.
Private object keys must use:

`<organization-id>/<workspace-id>/<document-id>/<filename>`

Postgres stores metadata and extraction state; private Storage stores original
file bytes. Database backups and object-storage backups are separate recovery
plans and must both be configured before hosted use.

Mapping activation is a single transaction through
`activate_mapping_draft(...)`. It locks the workspace and draft, validates that
all slots are reviewed, appends an immutable manifest version, points the
workspace to that version, and writes an audit event.

The synthetic local path is intentionally separate: see
`apps/web/.env.example` and `apps/web/src/lib/persistence/sqlite.ts`.
