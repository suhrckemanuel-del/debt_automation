# Agreement Intelligence web foundation

Next.js App Router product shell for the local synthetic F-001 workflow.

## Local synthetic run

From `apps/web`:

```powershell
npm install
npm run dev:synthetic
```

`dev:synthetic` starts both the deterministic Python API and Next.js, explicitly
selects the server-side SQLite adapter, a durable database path under `.data/`,
and the tracked synthetic demo manifest. The app does not use `localStorage`,
session storage, or the Next.js deployment filesystem as a hosted source of
truth.

Plain `npm run dev` intentionally requires equivalent environment variables and
fails closed when no persistence backend is selected. See `.env.example`.

To run only the deterministic engine:

```powershell
python app.py api --port 8765
```

Run that command from the repository root. Its versioned contract is
`../../contracts/engine-api.openapi.yaml`.

Ask runtime-validates the engine response, verifies each citation against the
persisted document, locator, page, and exact passage, then saves the answer,
citations, manifest version, and audit event in one transaction. Supported,
abstained, and human-review-required outputs remain distinct.

The dashboard uses the same contract for date-resolved contractual facts. It
does not calculate hierarchy in TypeScript. Every returned source is checked
against persisted document, locator, page, and exact-passage evidence before a
status is rendered. Engine or evidence failure produces an explicit unavailable
state rather than a fallback conclusion.

## Deterministic demo reset

With the app stopped and the Python engine running:

```powershell
npm run demo:reset
```

The reset replays the three canonical agreement questions and persists the
baseline LTV calculation plus three synthetic sensitivities through the live
Python engine. Use `npm run demo:reset -- --base-only` to seed only documents,
passages, mappings, and the active financial-model definition.

Open `/models` for the F-002 covenant-calculator decision surface. The page
reads only workspace-authorized persisted model versions and runs; **Refresh
calculation** calls the narrow local Python contract and appends immutable
results. If the engine is unavailable, prior persisted results remain readable.

The reset refuses anything that is not the explicit local synthetic SQLite
adapter: the backend must be `sqlite`, synthetic seeding must be enabled, the
database path must resolve inside `apps/web/.data/`, the manifest must be the
tracked synthetic demo manifest, and an existing database is deleted only if
it verifiably contains nothing but the synthetic demo workspace.

A row-level wipe is intentionally not used because activated manifest versions
are protected by immutability triggers. The reset recreates the database file
and re-runs the idempotent seed, then replays the three canonical questions
through the live engine and full citation validation so the saved answer
history is real engine output. `-- --base-only` skips the answer replay.

## Verification

```powershell
npm test
npm run lint
npm run build:synthetic
```

The persistence tests close and reopen the database, verify workspace and
answer state is retained, exercise rollback on invalid mapping activation,
prove activated manifests are append-only, and reject citation text that is not
an exact persisted source excerpt.
