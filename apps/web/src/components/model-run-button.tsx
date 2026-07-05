"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModelRunButton({ hasRun }: { hasRun: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
      {pending ? "Running…" : hasRun ? "Refresh calculation" : "Run calculation"}
    </Button>
  );
}
