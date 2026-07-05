import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SqlitePersistence } from "./sqlite";
import {
  assertSyntheticManifest,
  SYNTHETIC_ORGANIZATION_ID,
  SYNTHETIC_USER_ID,
  SYNTHETIC_WORKSPACE_ID,
} from "./synthetic-seed";

export interface DemoResetOptions {
  backend: string;
  databasePath: string;
  allowSyntheticSeed: boolean;
  syntheticManifestPath: string | null;
  /**
   * Directory the database file must resolve into. The CLI pins this to the
   * application's local `.data` directory; tests may point at a temporary
   * directory.
   */
  allowedDatabaseRoot: string;
}

export interface DemoResetResult {
  databasePath: string;
  documentCount: number;
  passageCount: number;
  activeManifestVersion: number | null;
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative.length > 0 &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
}

/**
 * Refuses every configuration that is not the explicitly named local
 * synthetic SQLite adapter. Nothing is deleted before every check passes.
 */
export function assertSafeDemoReset(options: DemoResetOptions): {
  databasePath: string;
  manifestPath: string;
} {
  if (options.backend !== "sqlite") {
    throw new Error(
      `Demo reset refuses backend "${options.backend}": only the explicit local SQLite adapter can be reset.`,
    );
  }
  if (!options.allowSyntheticSeed) {
    throw new Error(
      "Demo reset requires AGREEMENT_ALLOW_SYNTHETIC_SEED=true; it never runs against non-synthetic configurations.",
    );
  }
  if (!options.syntheticManifestPath) {
    throw new Error("Demo reset requires the tracked synthetic manifest path.");
  }

  const manifestPath = path.resolve(options.syntheticManifestPath);
  const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  // Throws unless this is the tracked synthetic demo manifest with
  // synthetic-corpus source paths only.
  assertSyntheticManifest(parsed, manifestPath);

  const databasePath = path.resolve(options.databasePath);
  const allowedRoot = path.resolve(options.allowedDatabaseRoot);
  if (!isWithin(allowedRoot, databasePath)) {
    throw new Error(
      `Demo reset refuses database path outside ${allowedRoot}: ${databasePath}`,
    );
  }

  if (fs.existsSync(databasePath)) {
    let database: Database.Database | null = null;
    try {
      database = new Database(databasePath, {
        readonly: true,
        fileMustExist: true,
      });
      const hasWorkspaces = database
        .prepare(
          `SELECT count(*) AS count FROM sqlite_master
           WHERE type = 'table' AND name = 'workspaces'`,
        )
        .get() as { count: number };
      if (hasWorkspaces.count === 1) {
        const foreign = database
          .prepare(
            `SELECT count(*) AS count FROM workspaces
             WHERE id <> ? OR slug <> 'demo'`,
          )
          .get(SYNTHETIC_WORKSPACE_ID) as { count: number };
        if (foreign.count > 0) {
          throw new Error(
            "Demo reset refuses to delete a database containing non-synthetic workspaces.",
          );
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Demo reset")) {
        throw error;
      }
      throw new Error(
        `Demo reset cannot verify ${databasePath} as the synthetic demo database (${
          error instanceof Error ? error.message : "unreadable file"
        }); remove it manually if that is intended.`,
      );
    } finally {
      database?.close();
    }
  }

  return { databasePath, manifestPath };
}

/**
 * Deterministically restores the synthetic demo database by recreating the
 * explicitly configured SQLite file and re-running the idempotent seed.
 *
 * A row-level transactional wipe is intentionally not used: activated
 * manifest versions carry immutability triggers that abort UPDATE and
 * DELETE. Recreating the database file preserves that append-only guarantee
 * within any one database's lifetime. Idempotent: repeated runs converge on
 * the same seeded state.
 */
export function resetSyntheticDemoState(
  options: DemoResetOptions,
): DemoResetResult {
  const { databasePath, manifestPath } = assertSafeDemoReset(options);

  for (const suffix of ["", "-wal", "-shm"]) {
    const target = `${databasePath}${suffix}`;
    try {
      fs.rmSync(target, { force: true });
    } catch (error) {
      throw new Error(
        `Demo reset could not remove ${target}. Stop the running app (npm run dev:synthetic) and retry. (${
          error instanceof Error ? error.message : String(error)
        })`,
      );
    }
  }

  const persistence = SqlitePersistence.open(databasePath, {
    allowSyntheticSeed: true,
    syntheticManifestPath: manifestPath,
  });
  try {
    const workspace = persistence
      .listWorkspaces({
        userId: SYNTHETIC_USER_ID,
        organizationId: SYNTHETIC_ORGANIZATION_ID,
      })
      .find((candidate) => candidate.id === SYNTHETIC_WORKSPACE_ID);
    if (!workspace) {
      throw new Error("Demo reset seeding did not produce the demo workspace.");
    }
    return {
      databasePath,
      documentCount: workspace.documentCount,
      passageCount: workspace.passageCount,
      activeManifestVersion: workspace.activeManifestVersion,
    };
  } finally {
    persistence.close();
  }
}
