"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  engineAnswerRequestSchema,
  requestEngineAnswer,
} from "@/lib/engine-contract";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";

export interface AskActionState {
  error: string | null;
}

export async function askAgreementQuestion(
  _previousState: AskActionState,
  formData: FormData,
): Promise<AskActionState> {
  const question = formData.get("question");
  const asOf = formData.get("asOf");
  const rawTestDate = formData.get("testDate");
  const parsed = engineAnswerRequestSchema.safeParse({
    question,
    as_of: asOf,
    test_date:
      typeof rawTestDate === "string" && rawTestDate.length > 0
        ? rawTestDate
        : null,
  });
  if (!parsed.success) {
    return {
      error:
        "Enter a question and valid as-of date before asking the engine.",
    };
  }

  let answerId: string;
  try {
    const persistence = getPersistence();
    const snapshot = persistence.getDashboardSnapshot(
      localSyntheticActor,
      localSyntheticWorkspaceId,
    );
    const answer = await requestEngineAnswer(
      snapshot.workspace.slug,
      parsed.data,
    );
    const saved = persistence.saveAnswer({
      actor: localSyntheticActor,
      workspaceId: localSyntheticWorkspaceId,
      answer,
      testDate: parsed.data.test_date,
    });
    answerId = saved.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("fetch failed") ||
      message.includes("timeout") ||
      message.includes("Engine API request failed")
    ) {
      return {
        error:
          "The local deterministic engine is unavailable. Start `python app.py api --port 8765` and try again.",
      };
    }
    return {
      error:
        "The answer was not saved because its engine response or source evidence failed validation.",
    };
  }

  revalidatePath("/ask");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  redirect(`/ask?answer=${encodeURIComponent(answerId)}`);
}
