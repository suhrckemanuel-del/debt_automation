"use server";

import { revalidatePath } from "next/cache";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";

export interface WorkspaceNameActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function updateWorkspaceName(
  _previousState: WorkspaceNameActionState,
  formData: FormData,
): Promise<WorkspaceNameActionState> {
  const name = formData.get("workspaceName");
  if (typeof name !== "string") {
    return { status: "error", message: "Workspace name is required." };
  }
  try {
    getPersistence().updateWorkspaceName(
      localSyntheticActor,
      localSyntheticWorkspaceId,
      name,
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "The workspace name could not be saved.",
    };
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Workspace name saved." };
}
