import "server-only";
import { loadPersistenceConfig } from "./config";
import { SqlitePersistence } from "./sqlite";
import {
  SYNTHETIC_ORGANIZATION_ID,
  SYNTHETIC_USER_ID,
  SYNTHETIC_WORKSPACE_ID,
} from "./synthetic-seed";
import type { ActorContext, Persistence } from "./types";

let persistence: Persistence | null = null;

export const localSyntheticActor: ActorContext = {
  userId: SYNTHETIC_USER_ID,
  organizationId: SYNTHETIC_ORGANIZATION_ID,
};

export const localSyntheticWorkspaceId = SYNTHETIC_WORKSPACE_ID;

export function getPersistence(): Persistence {
  if (!persistence) {
    const config = loadPersistenceConfig();
    persistence = SqlitePersistence.open(config.databasePath, {
      allowSyntheticSeed: config.allowSyntheticSeed,
      syntheticManifestPath: config.syntheticManifestPath,
    });
  }
  return persistence;
}
