/**
 * Deterministic synthetic demo reset.
 *
 * Usage (from apps/web, with the Python engine running for answer replay):
 *   npm run demo:reset              # full reset incl. canonical answer history
 *   npm run demo:reset -- --base-only   # documents/passages/manifest only
 *
 * Refuses any configuration that is not the explicit local synthetic SQLite
 * adapter. Never touches hosted data or browser storage. The dev server must
 * be stopped first; SQLite files cannot be replaced while the app holds them.
 */
import path from "node:path";
import {
  requestEngineAnswer,
  requestEngineLtvCalculation,
} from "../src/lib/engine-contract";
import { loadPersistenceConfig } from "../src/lib/persistence/config";
import { resetSyntheticDemoState } from "../src/lib/persistence/demo-reset";
import { SqlitePersistence } from "../src/lib/persistence/sqlite";
import {
  SYNTHETIC_ORGANIZATION_ID,
  SYNTHETIC_USER_ID,
  SYNTHETIC_WORKSPACE_ID,
} from "../src/lib/persistence/synthetic-seed";

const CANONICAL_AS_OF = "2026-07-02";
// Asked oldest-first so newest-first listings show the transaction question,
// the abstention, and then the supported threshold question.
const CANONICAL_QUESTIONS = [
  "What is the current maximum LTV, considering amendments or waivers?",
  "Does the facility require a debt yield covenant?",
  "Can the borrower sell part of the asset and distribute the proceeds?",
] as const;

async function main(): Promise<void> {
  const baseOnly = process.argv.includes("--base-only");
  const config = loadPersistenceConfig();
  const result = resetSyntheticDemoState({
    backend: config.backend,
    databasePath: config.databasePath,
    allowSyntheticSeed: config.allowSyntheticSeed,
    syntheticManifestPath: config.syntheticManifestPath,
    allowedDatabaseRoot: path.resolve(process.cwd(), ".data"),
  });
  console.log(
    `Synthetic base state restored: ${result.documentCount} documents, ` +
      `${result.passageCount} passages, manifest v${result.activeManifestVersion} ` +
      `at ${result.databasePath}`,
  );

  if (baseOnly) {
    console.log("Skipped answer replay (--base-only).");
    return;
  }

  const persistence = SqlitePersistence.open(result.databasePath, {
    allowSyntheticSeed: false,
    syntheticManifestPath: null,
  });
  const actor = {
    userId: SYNTHETIC_USER_ID,
    organizationId: SYNTHETIC_ORGANIZATION_ID,
  };
  try {
    for (const question of CANONICAL_QUESTIONS) {
      const answer = await requestEngineAnswer("demo", {
        question,
        as_of: CANONICAL_AS_OF,
        test_date: null,
      });
      const saved = persistence.saveAnswer({
        actor,
        workspaceId: SYNTHETIC_WORKSPACE_ID,
        answer,
        testDate: null,
      });
      console.log(
        `Replayed: ${saved.support_status} · ${saved.sources.length} citations · ${question}`,
      );
      // Distinct created_at timestamps keep newest-first ordering stable.
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    for (const scenarioId of [
      null,
      "valuation-down-5",
      "valuation-down-10",
      "repayment-1m",
    ]) {
      const calculation = await requestEngineLtvCalculation(
        "demo",
        scenarioId,
      );
      if (calculation.status !== "calculated_human_review_required") {
        throw new Error(calculation.missing_information.join(" "));
      }
      persistence.saveFinancialModelRun({
        actor,
        workspaceId: SYNTHETIC_WORKSPACE_ID,
        calculation,
      });
      console.log(
        `Calculated: ${calculation.scenario.label} · ${calculation.outputs.ltv_display} · human review required`,
      );
    }
    console.log(
      "Canonical answer history and covenant calculations restored through the live engine.",
    );
  } catch (error) {
    console.error(
      "Base state was restored, but engine replay failed. Start the engine " +
        "(python app.py api --port 8765 from the repository root) and re-run, " +
        "or pass --base-only to accept an empty answer history.",
    );
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    persistence.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
