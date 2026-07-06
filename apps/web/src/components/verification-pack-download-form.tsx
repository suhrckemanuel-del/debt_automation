"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const [downloadError, setDownloadError] = useState<{
    completedAt: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (
      !state.workbookBase64 ||
      !state.filename ||
      !state.completedAt ||
      lastDownloadRef.current === state.completedAt
    ) {
      return;
    }
    let url: string | null = null;
    try {
      const binary = atob(state.workbookBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      url = URL.createObjectURL(new Blob([bytes], { type: WORKBOOK_MIME }));
      const downloadUrl = url;
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = state.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      lastDownloadRef.current = state.completedAt;
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    } catch {
      if (url) {
        URL.revokeObjectURL(url);
      }
      const completedAt = state.completedAt;
      window.setTimeout(() => {
        setDownloadError({
          completedAt,
          message:
            "Workbook was generated, but the browser could not prepare the download. Try again.",
        });
      }, 0);
    }
  }, [state.workbookBase64, state.filename, state.completedAt]);

  const visibleError =
    state.error ??
    (downloadError?.completedAt === state.completedAt
      ? downloadError.message
      : null);

  return (
    <div>
      <form action={action}>
        <VerificationPackDownloadButton />
      </form>
      {visibleError ? (
        <p
          role="alert"
          className="mt-2 max-w-sm text-xs leading-5 text-destructive"
        >
          {visibleError}
        </p>
      ) : state.completedAt ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Workbook downloaded. Engine values remain authoritative.
        </p>
      ) : null}
    </div>
  );
}
