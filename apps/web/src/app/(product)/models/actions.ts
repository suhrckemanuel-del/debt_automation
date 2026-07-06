"use server";

import { revalidatePath } from "next/cache";
import {
  requestEngineLtvCalculation,
  requestEngineVerificationWorkbook,
  type CalculatedEngineLtv,
} from "@/lib/engine-contract";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";

export interface ModelRunActionState {
  error: string | null;
  completedAt: string | null;
}

export async function runFinancialModel(
  _previousState: ModelRunActionState,
): Promise<ModelRunActionState> {
  void _previousState;
  try {
    const persistence = getPersistence();
    const model = persistence.getActiveFinancialModel(
      localSyntheticActor,
      localSyntheticWorkspaceId,
      "ltv-v1",
    );
    if (!model) {
      return {
        error: "No authorized active LTV model is available.",
        completedAt: null,
      };
    }

    const calculations: CalculatedEngineLtv[] = [];
    for (const scenarioId of [
      null,
      ...model.scenarios.map((scenario) => scenario.scenarioId),
    ]) {
      const result = await requestEngineLtvCalculation("demo", scenarioId);
      if (result.status !== "calculated_human_review_required") {
        return {
          error: `Calculation unavailable: ${result.missing_information.join(" ")}`,
          completedAt: null,
        };
      }
      calculations.push(result);
    }

    for (const calculation of calculations) {
      persistence.saveFinancialModelRun({
        actor: localSyntheticActor,
        workspaceId: localSyntheticWorkspaceId,
        calculation,
      });
    }
    revalidatePath("/models");
    return { error: null, completedAt: new Date().toISOString() };
  } catch {
    return {
      error:
        "The calculation engine is unavailable. Persisted results remain readable; start the local engine and retry.",
      completedAt: null,
    };
  }
}

export interface VerificationPackActionState {
  error: string | null;
  workbookBase64: string | null;
  filename: string | null;
  completedAt: string | null;
}

export async function downloadVerificationPack(
  scenarioId: string,
  _previousState: VerificationPackActionState,
): Promise<VerificationPackActionState> {
  void _previousState;
  const failed = (error: string): VerificationPackActionState => ({
    error,
    workbookBase64: null,
    filename: null,
    completedAt: null,
  });
  try {
    const persistence = getPersistence();
    const model = persistence.getActiveFinancialModel(
      localSyntheticActor,
      localSyntheticWorkspaceId,
      "ltv-v1",
    );
    if (!model) {
      return failed("No authorized active LTV model is available.");
    }
    const run = model.latestRuns.find(
      (candidate) => candidate.scenarioId === scenarioId,
    );
    if (!run) {
      return failed(
        "No persisted run exists for this scenario. Run the calculation first.",
      );
    }

    const response = await requestEngineVerificationWorkbook(
      "demo",
      run.result,
    );
    try {
      persistence.recordVerificationPackProvenance({
        actor: localSyntheticActor,
        workspaceId: localSyntheticWorkspaceId,
        runId: run.id,
        scenarioId,
        sha256: response.provenance.sha256,
        engineVersion: response.provenance.engine_version,
        generatedAt: response.provenance.generated_at,
      });
    } catch {
      // An audit-log failure must not block the reviewer's download of a
      // value the engine already produced; the engine stays authoritative.
    }
    return {
      error: null,
      workbookBase64: response.workbook_base64,
      filename: `ltv-v1-v${run.modelVersion}-${scenarioId}-verification-pack.xlsx`,
      completedAt: new Date().toISOString(),
    };
  } catch {
    return failed(
      "The calculation engine is unavailable. Start the local engine and retry.",
    );
  }
}
