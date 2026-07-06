"use client";

import { useFormStatus } from "react-dom";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerificationPackDownloadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      <FileSpreadsheet
        className={pending ? "size-3.5 animate-pulse" : "size-3.5"}
      />
      {pending ? "Preparing…" : "Download verification pack"}
    </Button>
  );
}
