import path from "node:path";

export interface SqlitePersistenceConfig {
  backend: "sqlite";
  databasePath: string;
  allowSyntheticSeed: boolean;
  syntheticManifestPath: string | null;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required. Copy .env.example or run npm run dev:synthetic; ` +
        "the application will not fall back to browser or transient storage.",
    );
  }
  return value;
}

export function loadPersistenceConfig(): SqlitePersistenceConfig {
  const backend = required("AGREEMENT_DATA_BACKEND");
  if (backend !== "sqlite") {
    throw new Error(
      `Unsupported AGREEMENT_DATA_BACKEND=${backend}. ` +
        "This milestone implements the explicit local SQLite adapter; " +
        "the versioned Supabase/Postgres schema is in /supabase/migrations.",
    );
  }

  const allowSyntheticSeed =
    process.env.AGREEMENT_ALLOW_SYNTHETIC_SEED === "true";
  const manifest = process.env.AGREEMENT_SYNTHETIC_MANIFEST?.trim();

  if (allowSyntheticSeed && !manifest) {
    throw new Error(
      "AGREEMENT_SYNTHETIC_MANIFEST is required when synthetic seeding is enabled.",
    );
  }

  return {
    backend,
    databasePath: path.resolve(required("AGREEMENT_SQLITE_PATH")),
    allowSyntheticSeed,
    syntheticManifestPath: manifest ? path.resolve(manifest) : null,
  };
}
