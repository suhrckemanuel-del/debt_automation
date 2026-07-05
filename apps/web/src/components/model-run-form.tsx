"use client";

import { useActionState } from "react";
import {
  runFinancialModel,
  type ModelRunActionState,
} from "@/app/(product)/models/actions";
import { ModelRunButton } from "@/components/model-run-button";

const initialState: ModelRunActionState = {
  error: null,
  completedAt: null,
};

export function ModelRunForm({ hasRun }: { hasRun: boolean }) {
  const [state, action] = useActionState(runFinancialModel, initialState);
  return (
    <div>
      <form action={action}>
        <ModelRunButton hasRun={hasRun} />
      </form>
      {state.error ? (
        <p
          role="alert"
          className="mt-2 max-w-sm text-xs leading-5 text-destructive"
        >
          {state.error}
        </p>
      ) : state.completedAt ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Results persisted.
        </p>
      ) : null}
    </div>
  );
}
