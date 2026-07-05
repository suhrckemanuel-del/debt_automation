# Web persistence foundation

**Milestone:** local synthetic persistence-first web foundation  
**Date:** 2 July 2026

## Boundary

The existing deterministic Python engine remains authoritative for parsing,
retrieval, hierarchy resolution, abstention, and citation-producing answers.
`contracts/engine-api.openapi.yaml` defines the narrow adapter contract. The
Next.js application does not reimplement legal or currentness logic.

The Ask flow calls that adapter server-to-server, validates the response against
the contract, verifies every returned citation against the persisted source
passage and page, and atomically saves the answer, citations, active manifest
version, and audit event. A failed citation check saves nothing.

The dashboard calls the contract-position endpoint for current threshold,
amendment, waiver, and distribution-condition facts. Presentation language
remains in Next.js, but dates, values, active-state resolution, and source
citations come from the Python hierarchy engine. Contract or evidence mismatch
fails closed and suppresses the decision status.

## Persistence adapters

- Local synthetic development explicitly selects a server-side SQLite adapter.
  Its database survives browser refreshes, browser restarts, and application
  process restarts.
- Hosted persistence targets Supabase Postgres, Auth, and private Storage. The
  schema and RLS policies are versioned under `supabase/migrations/`.
- Browser storage is not an application source of truth.
- Deployment-local files are not an acceptable hosted source of truth.

The two adapters are separated behind the `Persistence` interface. This
milestone implements SQLite only; selecting another backend fails with a clear
configuration error instead of silently switching to transient state.

## Authorization and private documents

Every hosted row carries an organization/workspace boundary where applicable.
RLS requires organization membership and edit-capable roles for mutations.
Original files belong in the private `agreement-documents` bucket, using
organization and workspace IDs as key prefixes. The database stores metadata,
hashes, and storage keys, not original bytes.

Database backups and object-storage backups are independent recovery concerns.
Both are required before hosted operation.

## Mapping activation

Draft slots are mutable review state. An activated manifest is an immutable full
snapshot. The Postgres `activate_mapping_draft` function and the local SQLite
adapter both:

1. open a transaction and lock write access;
2. verify every expected slot is reviewed and has no validation error;
3. append the next manifest version;
4. advance the workspace active-version pointer;
5. mark the draft activated; and
6. append an audit event.

Any failure rolls back the complete operation.

## Synthetic seed

The local adapter reads only `workspaces/demo/manifest.json`, checks that it is
the tracked synthetic demo and that every source path remains under the
synthetic corpus, then imports its document metadata and reviewed provision
quotes. Seed execution is idempotent and only runs when explicitly enabled.

The local UI is not broader demand-validation evidence. It serves the named
design-partner workflow authorized in `prototype_decision.md`.
