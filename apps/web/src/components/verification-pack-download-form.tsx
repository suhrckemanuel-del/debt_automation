"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  downloadVerificationPack,
  type VerificationPackActionState,
} from "@/app/(product)/models/actions";
import { VerificationPackDownloadButton } from "@/components/verification-pack-download-button";

const initialState: VerificationPackActionState = {
  error: null,
  workbookBase64: null,
  filename: null,
  completedAt: null,
};

const WORKBOOK_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function VerificationPackDownloadForm({
  scenarioId,
}: {
  scenarioId: string;
}) {
  const [state, action] = useActionState(
    downloadVerificationPack.bind(null, scenarioId),
    initialState,
  );
  const lastDownloadRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !state.workbookBase64 ||
      !state.filename ||
      !state.completedAt ||
      lastDownloadRef.current === state.completedAt
    ) {
      return;
    }
    lastDownloadRef.current = state.completedAt;
    const binary = atob(state.workbookBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: WORKBOOK_MIME }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = state.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [state.workbookBase64, state.filename, state.completedAt]);

  return (
    <div>
      <form action={action}>
        <VerificationPackDownloadButton />
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
          Workbook downloaded. Engine values remain authoritative.
        </p>
      ) : null}
    </div>
  );
}
