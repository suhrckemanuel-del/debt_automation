"use server";

import { revalidatePath } from "next/cache";
import {
  requestEngineLtvCalculation,
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
