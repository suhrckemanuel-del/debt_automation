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
